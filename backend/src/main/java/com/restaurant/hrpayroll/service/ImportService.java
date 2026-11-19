package com.restaurant.hrpayroll.service;

import com.restaurant.hrpayroll.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.io.BufferedReader;
import java.io.StringReader;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ImportService {

  @PersistenceContext
  private EntityManager em;

  private final EmployeeService employeeService;

  public ImportService(EmployeeService employeeService) {
    this.employeeService = employeeService;
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

  public ImportResult processEmployeeCsv(String csvContent, Long currentUserId, boolean dryRun) {
    List<ImportErrorDto> errors = new ArrayList<>();
    List<EmployeeService.EmployeeInput> validRecords = new ArrayList<>();

    Set<String> seenCodesInFile = new HashSet<>();
    Set<String> seenEmailsInFile = new HashSet<>();

    int lineNum = 0;
    try (BufferedReader reader = new BufferedReader(new StringReader(csvContent))) {
      String line;
      boolean isHeader = true;
      while ((line = reader.readLine()) != null) {
        lineNum++;
        line = line.trim();
        if (line.isEmpty() || line.startsWith("#")) continue;

        if (isHeader) {
          isHeader = false;
          // check or skip header
          if (line.toLowerCase().contains("employee_code") || line.toLowerCase().contains("mã nv")) {
            continue;
          }
        }

        // CSV parsing (comma or semicolon)
        String delimiter = line.contains(";") ? ";" : ",";
        String[] cols = line.split(delimiter, -1);
        for (int i = 0; i < cols.length; i++) {
          cols[i] = cols[i].trim().replaceAll("^\"|\"$", "");
        }

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
        String branchIdStr = cols.length > 6 ? cols[6] : "1";
        String posIdStr = cols.length > 7 ? cols[7] : "2";
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

        LocalDate hireDate = LocalDate.now();
        if (!hireStr.isEmpty()) {
          try {
            hireDate = LocalDate.parse(hireStr);
          } catch (Exception e) {
            errors.add(new ImportErrorDto(lineNum, "hire_date", "Định dạng ngày tuyển dụng không hợp lệ (phải là YYYY-MM-DD).", "Ungültiges Einstellungsdatumsformat (YYYY-MM-DD erforderlich).", hireStr));
            lineHasError = true;
          }
        }

        // Wages & MiLoG Check
        BigDecimal hourly = null;
        if (!hourlyWageStr.isEmpty()) {
          try {
            hourly = new BigDecimal(hourlyWageStr.replace(",", "."));
            if (hourly.compareTo(EmployeeService.GERMAN_MINIMUM_WAGE_2024) < 0) {
              errors.add(new ImportErrorDto(
                lineNum, "hourly_wage",
                "Lương giờ (" + hourly + "€) vi phạm mức lương tối thiểu của Đức (MiLoG >= " + EmployeeService.GERMAN_MINIMUM_WAGE_2024 + "€).",
                "Stundenlohn unterschreitet den gesetzlichen Mindestlohn (" + EmployeeService.GERMAN_MINIMUM_WAGE_2024 + "€).",
                hourlyWageStr
              ));
              lineHasError = true;
            }
          } catch (Exception ex) {
            errors.add(new ImportErrorDto(lineNum, "hourly_wage", "Mức lương giờ không hợp lệ.", "Ungültiger Stundenlohn.", hourlyWageStr));
            lineHasError = true;
          }
        }

        BigDecimal monthly = null;
        if (!monthlyWageStr.isEmpty()) {
          try {
            monthly = new BigDecimal(monthlyWageStr.replace(",", "."));
            if ("MINIJOB".equalsIgnoreCase(contractType) && monthly.compareTo(EmployeeService.MINIJOB_MONTHLY_LIMIT) > 0) {
              errors.add(new ImportErrorDto(
                lineNum, "monthly_wage",
                "Minijob không được vượt quá " + EmployeeService.MINIJOB_MONTHLY_LIMIT + "€/tháng theo luật Đức.",
                "Minijob darf monatlich " + EmployeeService.MINIJOB_MONTHLY_LIMIT + "€ nicht überschreiten.",
                monthlyWageStr
              ));
              lineHasError = true;
            }
          } catch (Exception ex) {
            errors.add(new ImportErrorDto(lineNum, "monthly_wage", "Mức lương tháng không hợp lệ.", "Ungültiges Monatsgehalt.", monthlyWageStr));
            lineHasError = true;
          }
        }

        Long branchId = 1L;
        try { if (!branchIdStr.isEmpty()) branchId = Long.parseLong(branchIdStr); } catch (Exception ignored) {}

        Long positionId = 2L;
        try { if (!posIdStr.isEmpty()) positionId = Long.parseLong(posIdStr); } catch (Exception ignored) {}

        int weeklyMinutes = 2400;
        try { if (!weeklyHoursStr.isEmpty()) weeklyMinutes = (int)(Double.parseDouble(weeklyHoursStr) * 60); } catch (Exception ignored) {}

        if (!lineHasError) {
          validRecords.add(new EmployeeService.EmployeeInput(
            code, 1L, branchId, positionId, firstName, lastName, dob, email, hireDate,
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
}
