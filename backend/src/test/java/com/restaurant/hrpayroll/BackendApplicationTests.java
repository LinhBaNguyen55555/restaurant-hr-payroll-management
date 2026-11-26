package com.restaurant.hrpayroll;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:context;DB_CLOSE_DELAY=-1",
    "app.seed-demo=false",
    "app.mfa-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  }
)
class BackendApplicationTests {

  @Test
  void contextLoads() {}
}
