package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SchedulingService {

  @PersistenceContext
  private EntityManager em;

  private final LaborLawChecker lawChecker;
  private final Access access;

  public SchedulingService(LaborLawChecker lawChecker, Access access) {
    this.lawChecker = lawChecker;
    this.access = access;
  }

  public record ShiftDto(
    Long shiftId,
    Long employeeId,
    String employeeCode,
    String employeeName,
    String branchId,
    Long templateId,
    String templateName,
    Instant plannedStartUtc,
    Instant plannedEndUtc,
    Integer plannedBreakMinutes,
    String status, // DRAFT, PUBLISHED, CANCELLED
    Instant publishedAtUtc,
    Integer versionNumber,
    long durationMinutes,
    boolean isSunday,
    String positionName
  ) {}

  public record PublishResult(
    int publishedShiftCount,
    int versionNumber,
    boolean success,
    String messageVi,
    String messageDe,
    List<LaborLawChecker.Violation> warnings
  ) {}

  public List<ShiftTemplateEntity> listTemplates(String branchId) {
    if (branchId == null) {
      return em.createQuery("SELECT t FROM ShiftTemplateEntity t ORDER BY t.localStartTime", ShiftTemplateEntity.class).getResultList();
    }
    return em.createQuery("SELECT t FROM ShiftTemplateEntity t WHERE t.branchId = :b ORDER BY t.localStartTime", ShiftTemplateEntity.class)
      .setParameter("b", branchId)
      .getResultList();
  }

  public ShiftTemplateEntity createTemplate(ShiftTemplateEntity template) {
    if (template.templateName == null || template.templateName.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên mẫu ca không được để trống.");
    }
    if (template.localStartTime == null || template.localEndTime == null || template.localStartTime.equals(template.localEndTime)
      || template.defaultBreakMinutes == null || template.defaultBreakMinutes < 0)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giờ hoặc thời lượng nghỉ trong mẫu ca không hợp lệ.");
    template.templateId = null;
    em.persist(template);
    return template;
  }

  public List<ShiftDto> listShifts(String branchId, Instant startUtc, Instant endUtc, Long employeeId) {
    List<ShiftScheduleEntity> list = em.createQuery(
      "SELECT s FROM ShiftScheduleEntity s WHERE (:b is null or s.branchId = :b) AND s.plannedStartUtc < :e AND s.plannedEndUtc > :s AND s.status IN ('DRAFT','PUBLISHED') AND (:emp is null or (s.status='PUBLISHED' and s.employeeId=:emp)) ORDER BY s.plannedStartUtc ASC",
      ShiftScheduleEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("emp", employeeId)
    .setParameter("s", startUtc)
    .setParameter("e", endUtc)
    .getResultList();

    List<ShiftDto> result = new ArrayList<>();
    for (ShiftScheduleEntity s : list) {
      EmployeeEntity emp = em.find(EmployeeEntity.class, s.employeeId);
      String empName = emp != null ? emp.displayName : "ID: " + s.employeeId;
      String empCode = emp != null ? emp.employeeCode : "";

      String tmplName = null;
      if (s.templateId != null) {
        ShiftTemplateEntity tmpl = em.find(ShiftTemplateEntity.class, s.templateId);
        if (tmpl != null) tmplName = tmpl.templateName;
      }

      long dur = java.time.temporal.ChronoUnit.MINUTES.between(s.plannedStartUtc, s.plannedEndUtc);
      ZonedDateTime localStart = s.plannedStartUtc.atZone(ZoneId.of("Europe/Berlin"));
      boolean isSunday = localStart.getDayOfWeek() == java.time.DayOfWeek.SUNDAY;

      String posName = access.assignments(s.employeeId, localStart.toLocalDate()).stream()
        .filter(a -> s.branchId.equals(a.branchId) && a.positionId != null)
        .map(a -> em.find(PositionEntity.class, a.positionId)).filter(Objects::nonNull)
        .map(p -> p.positionNameDe).findFirst().orElse(null);

      result.add(new ShiftDto(
        s.shiftId,
        s.employeeId,
        empCode,
        empName,
        s.branchId,
        s.templateId,
        tmplName,
        s.plannedStartUtc,
        s.plannedEndUtc,
        s.plannedBreakMinutes,
        s.status,
        s.publishedAtUtc,
        s.versionNumber,
        dur,
        isSunday,
        posName
      ));
    }
    return result;
  }

  public ShiftScheduleEntity createShift(String branchId, Long employeeId, Long templateId, Instant startUtc, Instant endUtc, Integer breakMinutes) {
    if (employeeId == null || em.find(EmployeeEntity.class, employeeId, LockModeType.PESSIMISTIC_WRITE) == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhân viên không hợp lệ.");
    ensureAvailable(employeeId, startUtc, endUtc);
    if (templateId != null) {
      var template = em.find(ShiftTemplateEntity.class, templateId);
      if (template == null || !branchId.equals(template.branchId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mẫu ca không thuộc chi nhánh.");
    }
    if (breakMinutes != null && (breakMinutes < 0 || breakMinutes >= java.time.Duration.between(startUtc, endUtc).toMinutes()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời lượng nghỉ không hợp lệ.");
    if (endUtc.isBefore(startUtc) || endUtc.equals(startUtc)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giờ kết thúc ca phải sau giờ bắt đầu.");
    }

    ShiftScheduleEntity shift = new ShiftScheduleEntity();
    shift.branchId = branchId;
    shift.employeeId = employeeId;
    shift.templateId = templateId;
    shift.plannedStartUtc = startUtc;
    shift.plannedEndUtc = endUtc;
    shift.plannedBreakMinutes = breakMinutes != null ? breakMinutes : 30;
    shift.status = "DRAFT";
    shift.versionNumber = 1;

    // Check individual shift labor law rules
    EmployeeEntity emp = em.find(EmployeeEntity.class, employeeId);
    List<LaborLawChecker.Violation> violations = new ArrayList<>();
    lawChecker.validateSingleShift(shift, emp, violations);

    // Check consecutive rest intervals with adjacent shifts
    List<ShiftScheduleEntity> adjacentShifts = em.createQuery(
      "SELECT s FROM ShiftScheduleEntity s WHERE s.employeeId = :e AND s.status in ('DRAFT','PUBLISHED') AND s.plannedStartUtc >= :prior AND s.plannedEndUtc <= :post",
      ShiftScheduleEntity.class
    )
    .setParameter("e", employeeId)
    .setParameter("prior", startUtc.minus(24, java.time.temporal.ChronoUnit.HOURS))
    .setParameter("post", endUtc.plus(24, java.time.temporal.ChronoUnit.HOURS))
    .getResultList();

    for (ShiftScheduleEntity adj : adjacentShifts) {
      lawChecker.validateShiftPair(shift, adj, emp, violations);
    }

    for (LaborLawChecker.Violation v : violations) {
      if ("BLOCKER".equals(v.severity())) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vi phạm luật lao động Đức (" + v.legalBasis() + "): " + v.messageVi());
      }
    }

    em.persist(shift);
    return shift;
  }

  public void deleteShift(Long shiftId) {
    ShiftScheduleEntity s = em.find(ShiftScheduleEntity.class, shiftId, LockModeType.PESSIMISTIC_WRITE);
    if (s == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    if (!"DRAFT".equals(s.status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ có thể xóa ca nháp.");
    em.remove(s);
  }

  public PublishResult publishSchedule(String branchId, Instant startUtc, Instant endUtc, String publishedByUserId, String changeReason) {
    if (!endUtc.isAfter(startUtc)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng lịch không hợp lệ.");
    em.find(Domain.Branch.class, branchId, LockModeType.PESSIMISTIC_WRITE);
    // 1. Run full German labor law validation
    LaborLawChecker.CheckSummary summary = lawChecker.validateSchedule(branchId, startUtc, endUtc);
    if (!summary.validForPublish()) {
      StringBuilder sb = new StringBuilder("Không thể công bố lịch do có vi phạm luật lao động Đức bắt buộc (Blockers):\n");
      for (LaborLawChecker.Violation v : summary.violations()) {
        if ("BLOCKER".equals(v.severity())) {
          sb.append("• [").append(v.legalBasis()).append("] ").append(v.messageVi()).append("\n");
        }
      }
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, sb.toString());
    }

    // 2. Transition all DRAFT shifts in range to PUBLISHED
    List<ShiftScheduleEntity> shifts = em.createQuery(
      "SELECT s FROM ShiftScheduleEntity s WHERE s.branchId = :b AND s.plannedStartUtc >= :s AND s.plannedEndUtc <= :e AND s.status = 'DRAFT'",
      ShiftScheduleEntity.class
    )
    .setParameter("b", branchId)
    .setParameter("s", startUtc)
    .setParameter("e", endUtc)
    .getResultList();

    Instant now = Instant.now();
    Set<Long> affectedEmployees = new HashSet<>();
    int maxVersion = 1;

    for (ShiftScheduleEntity s : shifts) {
      s.status = "PUBLISHED";
      s.publishedAtUtc = now;
      s.versionNumber = s.versionNumber != null ? s.versionNumber + 1 : 1;
      if (s.versionNumber > maxVersion) maxVersion = s.versionNumber;
      affectedEmployees.add(s.employeeId);


    }

    // 3. Send notifications to affected employees
    for (Long empId : affectedEmployees) {
      NotificationEntity notif = new NotificationEntity();
      notif.recipientUserId = empId;
      notif.notificationType = "SCHEDULE_PUBLISHED";
      notif.title = "Lịch làm việc đã được công bố (Phiên bản " + maxVersion + ")";
      notif.message = (changeReason != null && !changeReason.isBlank())
        ? "Quản lý đã công bố lịch ca làm việc. Ghi chú thay đổi: " + changeReason
        : "Lịch ca làm việc mới đã được phát hành chính thức. Vui lòng kiểm tra ca trực của bạn.";
      notif.status = "UNREAD";
      em.persist(notif);
    }

    List<LaborLawChecker.Violation> warnings = summary.violations().stream()
      .filter(v -> "WARNING".equals(v.severity()))
      .toList();

    return new PublishResult(
      shifts.size(),
      maxVersion,
      true,
      "Đã công bố thành công " + shifts.size() + " ca làm việc (Phiên bản " + maxVersion + ").",
      shifts.size() + " Schichten erfolgreich veröffentlicht (Version " + maxVersion + ").",
      warnings
    );
  }

  public ShiftSwapRequestEntity requestSwap(Long sourceShiftId, Long targetEmployeeId, Long requestingEmployeeId, String reason) {
    ShiftScheduleEntity shift = em.find(ShiftScheduleEntity.class, sourceShiftId);
    if (shift == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ca làm việc cần đổi.");
    }
    if (!"PUBLISHED".equals(shift.status) || !shift.employeeId.equals(requestingEmployeeId) || Objects.equals(targetEmployeeId, requestingEmployeeId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chỉ có thể yêu cầu đổi ca của chính mình.");
    }
    long pendingCount = em.createQuery(
      "SELECT COUNT(r) FROM ShiftSwapRequestEntity r WHERE r.sourceShiftId = :s AND r.status = 'PENDING'",
      Long.class
    ).setParameter("s", sourceShiftId).getSingleResult();
    if (pendingCount > 0) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ca làm việc này đang có yêu cầu đổi ca chờ duyệt.");
    }

    ShiftSwapRequestEntity req = new ShiftSwapRequestEntity();
    req.sourceShiftId = sourceShiftId;
    req.targetEmployeeId = targetEmployeeId;
    req.requestedByEmployeeId = requestingEmployeeId;
    req.reason = reason;
    req.status = "PENDING";
    req.createdAtUtc = Instant.now();
    em.persist(req);

    // Notify target employee
    NotificationEntity notif = new NotificationEntity();
    notif.recipientUserId = targetEmployeeId;
    notif.notificationType = "SWAP_REQUESTED";
    notif.title = "Yêu cầu đổi ca làm việc";
    notif.message = "Đồng nghiệp đề nghị đổi ca với bạn. Lý do: " + (reason != null ? reason : "Không có");
    notif.status = "UNREAD";
    em.persist(notif);

    return req;
  }

  public void approveSwap(Long swapRequestId, String managerUserId, String decisionReason) {
    ShiftSwapRequestEntity req = em.find(ShiftSwapRequestEntity.class, swapRequestId, LockModeType.PESSIMISTIC_WRITE);
    if (req == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu đổi ca.");
    if (!"PENDING".equals(req.status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu đổi ca không ở trạng thái chờ duyệt.");

    // Lock source shift with PESSIMISTIC_WRITE to prevent race condition / double swaps
    ShiftScheduleEntity shift = em.find(ShiftScheduleEntity.class, req.sourceShiftId, LockModeType.PESSIMISTIC_WRITE);
    if (shift == null || !"PUBLISHED".equals(shift.status) || !shift.employeeId.equals(req.requestedByEmployeeId)
      || !access.assignedTo(req.targetEmployeeId, shift.branchId, shift.plannedStartUtc.atZone(ZoneId.of("Europe/Berlin")).toLocalDate())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ca làm việc không còn khả dụng để đổi.");
    }

    // Verify German labor law for target employee with this new shift!
    EmployeeEntity targetEmp = em.find(EmployeeEntity.class, req.targetEmployeeId, LockModeType.PESSIMISTIC_WRITE);
    if (targetEmp == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Không tìm thấy nhân viên nhận ca.");
    ensureAvailable(req.targetEmployeeId, shift.plannedStartUtc, shift.plannedEndUtc);
    List<LaborLawChecker.Violation> violations = new ArrayList<>();
    lawChecker.validateSingleShift(shift, targetEmp, violations);

    // Check adjacent rest period for target employee
    List<ShiftScheduleEntity> adjacentShifts = em.createQuery(
      "SELECT s FROM ShiftScheduleEntity s WHERE s.employeeId = :e AND s.status IN ('DRAFT','PUBLISHED') AND s.plannedStartUtc >= :prior AND s.plannedEndUtc <= :post",
      ShiftScheduleEntity.class
    )
    .setParameter("e", req.targetEmployeeId)
    .setParameter("prior", shift.plannedStartUtc.minus(24, java.time.temporal.ChronoUnit.HOURS))
    .setParameter("post", shift.plannedEndUtc.plus(24, java.time.temporal.ChronoUnit.HOURS))
    .getResultList();

    for (ShiftScheduleEntity adj : adjacentShifts) {
      lawChecker.validateShiftPair(shift, adj, targetEmp, violations);
    }

    for (LaborLawChecker.Violation v : violations) {
      if ("BLOCKER".equals(v.severity())) {
        throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Không thể phê duyệt đổi ca: Nhân viên nhận ca sẽ vi phạm luật lao động (" + v.legalBasis() + "): " + v.messageVi()
        );
      }
    }

    // Perform the swap
    Long oldEmpId = shift.employeeId;
    shift.employeeId = req.targetEmployeeId;
    shift.versionNumber = shift.versionNumber != null ? shift.versionNumber + 1 : 1;

    req.status = "APPROVED";
    req.reviewedByUserId = managerUserId;

    // Send notifications to both employees
    NotificationEntity n1 = new NotificationEntity();
    n1.recipientUserId = oldEmpId;
    n1.notificationType = "SWAP_APPROVED";
    n1.title = "Đổi ca thành công";
    n1.message = "Yêu cầu đổi ca của bạn đã được quản lý phê duyệt.";
    em.persist(n1);

    NotificationEntity n2 = new NotificationEntity();
    n2.recipientUserId = req.targetEmployeeId;
    n2.notificationType = "SWAP_APPROVED";
    n2.title = "Phân công ca mới sau khi đổi ca";
    n2.message = "Bạn đã được phân công ca làm việc mới theo yêu cầu đổi ca đã duyệt.";
    em.persist(n2);
  }

  public void rejectSwap(Long swapRequestId, String managerUserId, String decisionReason) {
    ShiftSwapRequestEntity req = em.find(ShiftSwapRequestEntity.class, swapRequestId, LockModeType.PESSIMISTIC_WRITE);
    if (req == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu đổi ca.");

    if (!"PENDING".equals(req.status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu đã được xử lý.");
    req.status = "REJECTED";
    req.reviewedByUserId = managerUserId;

    NotificationEntity n = new NotificationEntity();
    n.recipientUserId = req.requestedByEmployeeId;
    n.notificationType = "SWAP_REJECTED";
    n.title = "Yêu cầu đổi ca bị từ chối";
    n.message = "Quản lý đã từ chối yêu cầu đổi ca. Lý do: " + (decisionReason != null ? decisionReason : "Không phù hợp điều kiện vận hành");
    em.persist(n);
  }

  private void ensureAvailable(Long employee, Instant start, Instant end) {
    LocalDate from = start.atZone(ZoneId.of("Europe/Berlin")).toLocalDate();
    LocalDate to = end.minusNanos(1).atZone(ZoneId.of("Europe/Berlin")).toLocalDate();
    long approvedLeave = em.createQuery("""
      select count(r) from LeaveRequestEntity r where r.employeeId=:employee and r.status='APPROVED'
      and r.startDate<=:to and r.endDate>=:from
      """, Long.class).setParameter("employee", employee)
      .setParameter("from", from).setParameter("to", to).getSingleResult();
    long sickLeave = em.createQuery("""
      select count(a) from SicknessAbsenceEntity a where a.employeeId=:employee and a.verificationStatus<>'REJECTED'
      and a.startDate<=:to and a.endDate>=:from
      """, Long.class).setParameter("employee", employee)
      .setParameter("from", from).setParameter("to", to).getSingleResult();
    if (approvedLeave + sickLeave > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Nhân viên có lịch nghỉ trùng ca.");
  }

  public record SwapRequestDto(
    Long swapRequestId,
    Long sourceShiftId,
    Long targetEmployeeId,
    String targetEmployeeName,
    Long requestedByEmployeeId,
    String requestedByEmployeeName,
    String reason,
    String status,
    String reviewedByUserId,
    Instant createdAtUtc
  ) {}

  public List<SwapRequestDto> listSwapRequests(String branchId, Long employee) {
    List<ShiftSwapRequestEntity> list = em.createQuery("""
      select r from ShiftSwapRequestEntity r, ShiftScheduleEntity s where r.sourceShiftId=s.shiftId
      and (:branch is null or s.branchId=:branch)
      and (:employee is null or r.requestedByEmployeeId=:employee or r.targetEmployeeId=:employee)
      order by r.createdAtUtc desc
      """, ShiftSwapRequestEntity.class).setParameter("branch", branchId)
      .setParameter("employee", employee).setMaxResults(50).getResultList();
    Map<Long, String> names = new HashMap<>();
    return list.stream().map(r -> {
      String targetName = names.computeIfAbsent(r.targetEmployeeId, id -> {
        EmployeeEntity e = em.find(EmployeeEntity.class, id);
        return e != null ? e.displayName : null;
      });
      String requesterName = names.computeIfAbsent(r.requestedByEmployeeId, id -> {
        EmployeeEntity e = em.find(EmployeeEntity.class, id);
        return e != null ? e.displayName : null;
      });
      return new SwapRequestDto(
        r.swapRequestId,
        r.sourceShiftId,
        r.targetEmployeeId,
        targetName,
        r.requestedByEmployeeId,
        requesterName,
        r.reason,
        r.status,
        r.reviewedByUserId,
        r.createdAtUtc
      );
    }).toList();
  }
}
