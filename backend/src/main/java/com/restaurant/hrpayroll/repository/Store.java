package com.restaurant.hrpayroll.repository;

import static com.restaurant.hrpayroll.entity.Domain.*;



import jakarta.persistence.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class Store {

  @PersistenceContext
  EntityManager em;

  public <T> List<T> all(Class<T> type) {
    return em
      .createQuery("select e from " + type.getSimpleName() + " e", type)
      .getResultList();
  }

  public <T> T get(Class<T> type, String id) {
    T row = em.find(type, id);
    if (row == null) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Datensatz nicht gefunden."
    );
    return row;
  }

  public <T> T save(T row) {
    em.persist(row);
    return row;
  }

  public void flush() {
    em.flush();
  }

  public void touchSession(String id, java.time.Instant expiresAt) {
    em.createQuery(
      "update AccountSession s set s.expiresAt=:expiry where s.id=:id"
    )
      .setParameter("expiry", expiresAt)
      .setParameter("id", id)
      .executeUpdate();
  }

  public <T> T find(Class<T> type, String id) {
    return em.find(type, id);
  }

  public void lock(Object row) {
    em.lock(row, LockModeType.PESSIMISTIC_WRITE);
  }

  public UserAccount byEmail(String email) {
    if (email == null) return null;
    String q = email.toLowerCase(Locale.ROOT).trim();
    return em
      .createQuery(
        "select u from UserAccount u where lower(u.email)=:q or lower(u.email)=:domain or lower(u.email)=:atelier or lower(u.name)=:q or u.id=:q",
        UserAccount.class
      )
      .setParameter("q", q)
      .setParameter("domain", q + "@restaurant.example")
      .setParameter("atelier", q + "@atelier.local")
      .getResultStream()
      .findFirst()
      .orElse(null);
  }

  public static void checkVersion(Row row, long expected) {
    if (row.version != expected) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Dieser Datensatz wurde geändert. Bitte neu laden."
    );
  }
}
