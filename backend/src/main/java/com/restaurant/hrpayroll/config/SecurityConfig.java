package com.restaurant.hrpayroll.config;

import com.restaurant.hrpayroll.service.AuthService;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {

  @Bean
  org.springframework.security.core.userdetails.UserDetailsService sessionOnlyUsers() {
    return username -> {
      throw new org.springframework.security.core.userdetails.UsernameNotFoundException(
        "Session authentication only"
      );
    };
  }

  @Bean
  SecurityFilterChain security(
    HttpSecurity http,
    AuthService auth
  ) throws Exception {
    var handler = new CsrfTokenRequestAttributeHandler();
    http
      .csrf(csrf ->
        csrf
          .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
          .csrfTokenRequestHandler(handler)
      )
      .authorizeHttpRequests(a ->
        a
          .requestMatchers("/api/v1/health", "/api/v1/auth/**", "/error")
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .requestCache(c -> c.disable())
      .formLogin(c -> c.disable())
      .httpBasic(c -> c.disable())
      .logout(c -> c.disable())
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((req, res, ex) -> {
            res.setStatus(401);
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Bitte anmelden.\"}");
          })
          .accessDeniedHandler((req, res, ex) -> {
            res.setStatus(403);
            res.setContentType("application/json");
            res
              .getWriter()
              .write(
                "{\"message\":\"Zugriff verweigert oder Sicherheitstoken abgelaufen. Bitte neu laden.\"}"
              );
          })
      )
      .addFilterBefore(
        new OncePerRequestFilter() {
          @Override
          protected void doFilterInternal(
            HttpServletRequest req,
            HttpServletResponse res,
            FilterChain chain
          ) throws ServletException, IOException {
            var user = auth.identity(req.getSession(false));
            if (user != null
              && !req.getRequestURI().startsWith(req.getContextPath() + "/api/v1/auth/")
              && !req.getRequestURI().equals(req.getContextPath() + "/api/v1/health")
              && (user.mfaEnabled || AuthService.sensitive(user))
              && (!user.mfaEnabled || !Boolean.TRUE.equals(req.getSession(false).getAttribute("mfaVerified")))) {
              res.setStatus(403);
              res.setContentType("application/json;charset=UTF-8");
              res.getWriter().write("{\"message\":\"Bitte zuerst die Zwei-Faktor-Anmeldung abschließen.\"}");
              return;
            }
            if (
              user != null
            ) SecurityContextHolder.getContext().setAuthentication(
              UsernamePasswordAuthenticationToken.authenticated(
                user,
                null,
                List.of()
              )
            );
            try {
              chain.doFilter(req, res);
            } finally {
              SecurityContextHolder.clearContext();
            }
          }
        },
        UsernamePasswordAuthenticationFilter.class
      );
    return http.build();
  }
}
