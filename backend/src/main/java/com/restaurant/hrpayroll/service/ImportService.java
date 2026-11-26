package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.io.BufferedReader;
import java.io.StringReader;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ImportService {

  @PersistenceContext
  private EntityManager em;

  private final EmployeeService employeeService;
  private final Access access;

  public ImportService(EmployeeService employeeService, Access access) {
    this.employeeService = employeeService;
    this.access = access;
  }

  public record ImportErrorDto(
    int lineNumber,
    String fieldName,
    String errorMessageVi,
    String errorMessageDe,
    String rawValue
  ) {}

  public record ImportResult(
    Long jobId,
    boolean dryRun,
    int totalRows,
    int successRows,
    int errorRows,
    String status,
    List<ImportErrorDto> errors
  ) {}

  public ImportResult processEmployeeCsv(String csvContent, String currentUserId, boolean dryRun) {
    List<ImportErrorDto> errors = new ArrayList<>();
    List<EmployeeService.EmployeeInput> validRecords = new ArrayList<>();

    Set<String> seenCodesInFile = new HashSet<>();
    Set<String> seenEmailsInFile = new HashSet<>();

    int lineNum = 0;
    try (BufferedReader reader = new BufferedReader(new StringReader(csvContent))) {
      String line;
      boolean isHeader = true;
      Character detectedDelimiter = null;
      while ((line = reader.readLine()) != null) {
        lineNum++;
        line = line.trim();
        if (line.isEmpty() || line.startsWith("#")) continue;

        if (detectedDelimiter == null) {
          detectedDelimiter = detectDelimiter(line);
        }

        if (isHeader) {
          isHeader = false;
          // check or skip header
          if (line.toLowerCase().contains("employee_code") || line.toLowerCase().contains("mã nv")) {
            continue;
          }
        }

        // RFC-style CSV parsing preserving delimiters inside quotes
        String[] cols = parseCsvLine(line, detectedDelimiter);

        if (cols.length < 5) {
          errors.add(new ImportErrorDto(
            lineNum, "row",
            "Dòng không đủ số cột dữ liệu bắt buộc (tối thiểu 5 cột: Mã NV, Họ, Tên, Ngày sinh, Ngày tuyển dụng).",
            "Zeile hat unzureichende Spaltenanzahl.",
            line
          ));
          continue;
        }

        String code = cols.length > 0 ? cols[0] : "";
        String firstName = cols.length > 1 ? cols[1] : "";
        String lastName = cols.length > 2 ? cols[2] : "";
        String email = cols.length > 3 ? cols[3] : "";
        String dobStr = cols.length > 4 ? cols[4] : "";
        String hireStr = cols.length > 5 ? cols[5] : "";
        String branchIdStr = cols.length > 6 ? cols[6] : "";
        String posIdStr = cols.length > 7 ? cols[7] : "";
        String contractType = cols.length > 8 && !cols[8].isEmpty() ? cols[8].toUpperCase() : "UNLIMITED";
        String payType = cols.length > 9 && !cols[9].isEmpty() ? cols[9].toUpperCase() : "HOURLY";
        String weeklyHoursStr = cols.length > 10 ? cols[10] : "40";
        String hourlyWageStr = cols.length > 11 ? cols[11] : "";
        String monthlyWageStr = cols.length > 12 ? cols[12] : "";

        boolean lineHasError = false;

        // Check required fields
        if (code.isEmpty()) {
          errors.add(new ImportErrorDto(lineNum, "employee_code", "Mã nhân viên không được để trống.", "Mitarbeitercode darf nicht leer sein.", code));
          lineHasError = true;
        } else if (seenCodesInFile.contains(code)) {
          errors.add(new ImportErrorDto(lineNum, "employee_code", "Mã nhân viên bị trùng lặp ngay trong tệp tải lên.", "Mitarbeitercode ist innerhalb der Datei doppelt vorhanden.", code));
          lineHasError = true;
        } else {
          // Check DB duplicate
          Long count = em.createQuery("SELECT COUNT(e) FROM EmployeeEntity e WHERE e.employeeCode = :c", Long.class)
            .setParameter("c", code).getSingleResult();
          if (count > 0) {
            errors.add(new ImportErrorDto(lineNum, "employee_code", "Mã nhân viên đã tồn tại trong cơ sở dữ liệu.", "Mitarbeitercode existiert bereits in der Datenbank.", code));
            lineHasError = true;
          } else {
            seenCodesInFile.add(code);
          }
        }

        if (firstName.isEmpty()) {
          errors.add(new ImportErrorDto(lineNum, "first_name", "Tên không được để trống.", "Vorname darf nicht leer sein.", firstName));
          lineHasError = true;
        }
        if (lastName.isEmpty()) {
          errors.add(new ImportErrorDto(lineNum, "last_name", "Họ không được để trống.", "Nachname darf nicht leer sein.", lastName));
          lineHasError = true;
        }

        // Email check
        if (!email.isEmpty()) {
          if (seenEmailsInFile.contains(email.toLowerCase())) {
            errors.add(new ImportErrorDto(lineNum, "email", "Email bị trùng lặp trong tệp tải lên.", "E-Mail ist in der Datei doppelt vorhanden.", email));
            lineHasError = true;
          } else {
            Long count = em.createQuery("SELECT COUNT(e) FROM EmployeeEntity e WHERE LOWER(e.email) = :m", Long.class)
              .setParameter("m", email.toLowerCase()).getSingleResult();
            if (count > 0) {
              errors.add(new ImportErrorDto(lineNum, "email", "Email đã được sử dụng bởi nhân viên khác.", "E-Mail ist bereits vergeben.", email));
              lineHasError = true;
            } else {
              seenEmailsInFile.add(email.toLowerCase());
            }
          }
        }

        // Parse dates
        LocalDate dob = null;
        if (!dobStr.isEmpty()) {
          try {
            dob = LocalDate.parse(dobStr);
          } catch (Exception e) {
            errors.add(new ImportErrorDto(lineNum, "date_of_birth", "Định dạng ngày sinh không hợp lệ (phải là YYYY-MM-DD).", "Ungültiges Geburtsdatumsformat (YYYY-MM-DD erforderlich).", dobStr));
            lineHasError = true;
          }
        }

        LocalDate hireDate = LocalDate.now(ZoneId.of("Europe/Berlin"));
        boolean hireDateValid = true;
        if (!hireStr.isEmpty()) {
          try {
            hireDate = LocalDate.parse(hireStr);
          } catch (Exception e) {
            errors.add(new ImportErrorDto(lineNum, "hire_date", "Định dạng ngày tuyển dụng không hợp lệ (phải là YYYY-MM-DD).", "Ungültiges Einstellungsdatumsformat (YYYY-MM-DD erforderlich).", hireStr));
            lineHasError = true;
            hireDateValid = false;
          }
        }

        // Wages & MiLoG Check
        BigDecimal hourly = null;
        if (!hourlyWageStr.isEmpty()) {
          try {
            hourly = new BigDecimal(hourlyWageStr.replace(",", "."));
            if (hireDateValid) {
              BigDecimal minWage = EmployeeService.minimumWage(hireDate);
              if (hourly.compareTo(minWage) < 0) {
                errors.add(new ImportErrorDto(
                  lineNum, "hourly_wage",
                  "Lương giờ (" + hourly + "€) vi phạm mức lương tối thiểu của Đức (MiLoG >= " + minWage + "€).",
                  "Stundenlohn unterschreitet den gesetzlichen Mindestlohn (" + minWage + "€).",
                  hourlyWageStr
                ));
                lineHasError = true;
              }
            }
          } catch (ResponseStatusException rse) {
            errors.add(new ImportErrorDto(lineNum, "hire_date", rse.getReason(), "Mindestlohn für Einstellungsdatum nicht konfiguriert.", hireStr));
            lineHasError = true;
          } catch (Exception ex) {
            errors.add(new ImportErrorDto(lineNum, "hourly_wage", "Mức lương giờ không hợp lệ.", "Ungültiger Stundenlohn.", hourlyWageStr));
            lineHasError = true;
          }
        }

        BigDecimal monthly = null;
        if (!monthlyWageStr.isEmpty()) {
          try {
            monthly = new BigDecimal(monthlyWageStr.replace(",", "."));
            if (monthly.signum() <= 0) throw new IllegalArgumentException();
            if ("MINIJOB".equalsIgnoreCase(contractType) && hireDateValid) {
              BigDecimal limit = EmployeeService.minijobLimit(hireDate);
              if (monthly.compareTo(limit) > 0) {
                errors.add(new ImportErrorDto(
                  lineNum, "monthly_wage",
                  "Minijob không được vượt quá " + limit + "€/tháng theo luật Đức.",
                  "Minijob darf monatlich " + limit + "€ nicht überschreiten.",
                  monthlyWageStr
                ));
                lineHasError = true;
              }
            }
          } catch (ResponseStatusException rse) {
            errors.add(new ImportErrorDto(lineNum, "hire_date", rse.getReason(), "Minijob-Grenze für Einstellungsdatum nicht konfiguriert.", hireStr));
            lineHasError = true;
          } catch (Exception ex) {
            errors.add(new ImportErrorDto(lineNum, "monthly_wage", "Mức lương tháng không hợp lệ.", "Ungültiges Monatsgehalt.", monthlyWageStr));
            lineHasError = true;
          }
        }

        var branch = branchIdStr.isBlank() ? null : em.find(Domain.Branch.class, branchIdStr);
        if (branch == null || !branch.active || !access.branch(access.auth.current(), branch)) {
          errors.add(new ImportErrorDto(lineNum, "branch_id", "Chi nhánh không hợp lệ hoặc ngoài phạm vi.", "Standort fehlt oder liegt außerhalb des Zugriffsbereichs.", branchIdStr));
          lineHasError = true;
        } else if (em.createQuery("select count(l) from WorkLocation l where l.active=true and l.branchId=:id", Long.class)
          .setParameter("id", branch.id).getSingleResult() == 0) {
          errors.add(new ImportErrorDto(lineNum, "branch_id", "Chi nhánh chưa có địa điểm làm việc.", "Standort hat keinen aktiven Arbeitsort.", branchIdStr));
          lineHasError = true;
        }
        Long positionId = Access.numericId(posIdStr);
        PositionEntity position = positionId == null ? null : em.find(PositionEntity.class, positionId);
        if (!posIdStr.isBlank() && (position == null || !position.active)) {
          errors.add(new ImportErrorDto(lineNum, "position_id", "Vị trí không hợp lệ.", "Ungültige Position.", posIdStr));
          lineHasError = true;
        }
        int weeklyMinutes = 0;
        try {
          weeklyMinutes = new BigDecimal(weeklyHoursStr.replace(",", ".")).multiply(BigDecimal.valueOf(60)).intValueExact();
          if (weeklyMinutes <= 0 || weeklyMinutes > 3600) throw new IllegalArgumentException();
        } catch (IllegalArgumentException | ArithmeticException e) {
          errors.add(new ImportErrorDto(lineNum, "weekly_hours", "Số giờ tuần không hợp lệ.", "Ungültige Wochenstunden.", weeklyHoursStr));
          lineHasError = true;
        }

        if (!lineHasError && branch != null) {
          validRecords.add(new EmployeeService.EmployeeInput(
            code, branch.legalEntityId, branch.id, positionId, firstName, lastName, dob, email, hireDate,
            contractType, payType, weeklyMinutes, hourly, monthly
          ));
        }
      }
    } catch (Exception e) {
      errors.add(new ImportErrorDto(0, "file", "Không thể đọc nội dung tệp: " + e.getMessage(), "Datei konnte nicht gelesen werden.", ""));
    }

    int total = validRecords.size() + errors.size();
    int success = validRecords.size();
    int errCount = errors.size();

    Long jobId = null;
    if (!dryRun) {
      // Persist Import Job
      ImportJobEntity job = new ImportJobEntity();
      job.fileName = "employee_import_" + Instant.now().toEpochMilli() + ".csv";
      job.jobType = "EMPLOYEES";
      job.totalRows = total;
      job.successRows = success;
      job.errorRows = errCount;
      job.status = errCount == 0 ? "COMPLETED" : (success > 0 ? "COMPLETED_WITH_WARNINGS" : "FAILED");
      job.createdByUserId = currentUserId;
      job.summaryReport = "Nhập thành công " + success + "/" + total + " nhân viên. Số lỗi: " + errCount;
      em.persist(job);
      em.flush();
      jobId = job.jobId;

      // Save Import Errors
      for (ImportErrorDto err : errors) {
        ImportErrorEntity errEntity = new ImportErrorEntity();
        errEntity.jobId = job.jobId;
        errEntity.lineNumber = err.lineNumber();
        errEntity.fieldName = err.fieldName();
        errEntity.errorMessageVi = err.errorMessageVi();
        errEntity.errorMessageDe = err.errorMessageDe();
        errEntity.rawValue = err.rawValue();
        em.persist(errEntity);
      }

      // Persist Valid Records
      for (EmployeeService.EmployeeInput valid : validRecords) {
        employeeService.createEmployee(valid);
      }
    }

    return new ImportResult(
      jobId,
      dryRun,
      total,
      success,
      errCount,
      errCount == 0 ? "SUCCESS" : (success > 0 ? "PARTIAL_SUCCESS" : "FAILED"),
      errors
    );
  }

  private static char detectDelimiter(String line) {
    boolean inQuotes = false;
    int semicolons = 0;
    int commas = 0;
    for (int i = 0; i < line.length(); i++) {
      char c = line.charAt(i);
      if (c == '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (c == ';') semicolons++;
        else if (c == ',') commas++;
      }
    }
    return semicolons >= commas && semicolons > 0 ? ';' : ',';
  }

  private static String[] parseCsvLine(String line, char delimiter) {
    List<String> fields = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    boolean inQuotes = false;
    for (int i = 0; i < line.length(); i++) {
      char c = line.charAt(i);
      if (c == '"') {
        if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
          current.append('"');
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c == delimiter && !inQuotes) {
        fields.add(current.toString().trim());
        current.setLength(0);
      } else {
        current.append(c);
      }
    }
    fields.add(current.toString().trim());
    return fields.toArray(new String[0]);
  }
}
