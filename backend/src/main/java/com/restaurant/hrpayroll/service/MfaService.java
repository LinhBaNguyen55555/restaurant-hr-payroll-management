package com.restaurant.hrpayroll.service;

import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.time.Instant;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MfaService {

  private final byte[] key;
  private final SecureRandom random = new SecureRandom();

  public MfaService(
    @Value("${app.mfa-key:}") String configured,
    @Value("${spring.profiles.active:dev}") String profile
  ) throws Exception {
    if (!configured.isBlank()) key = Base64.getDecoder().decode(configured);
    else {
      if (profile.contains("mysql")) throw new IllegalStateException(
        "MFA_ENCRYPTION_KEY is required outside development."
      );
      Path file = Path.of("data", "mfa.key");
      Files.createDirectories(file.getParent());
      if (!Files.exists(file)) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        Files.write(file, bytes, StandardOpenOption.CREATE_NEW);
      }
      key = Files.readAllBytes(file);
    }
    if (key.length != 32) throw new IllegalArgumentException(
      "MFA key must contain 32 bytes."
    );
  }

  public String newSecret() {
    byte[] b = new byte[20];
    random.nextBytes(b);
    return base32(b);
  }

  public String encrypt(String secret) {
    try {
      byte[] iv = new byte[12];
      random.nextBytes(iv);
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(
        Cipher.ENCRYPT_MODE,
        new SecretKeySpec(key, "AES"),
        new GCMParameterSpec(128, iv)
      );
      byte[] data = c.doFinal(secret.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(
        ByteBuffer.allocate(iv.length + data.length)
          .put(iv)
          .put(data)
          .array()
      );
    } catch (Exception e) {
      throw new IllegalStateException("Cannot protect MFA secret", e);
    }
  }

  public String decrypt(String encrypted) {
    try {
      byte[] all = Base64.getDecoder().decode(encrypted);
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(
        Cipher.DECRYPT_MODE,
        new SecretKeySpec(key, "AES"),
        new GCMParameterSpec(128, Arrays.copyOf(all, 12))
      );
      return new String(
        c.doFinal(Arrays.copyOfRange(all, 12, all.length)),
        StandardCharsets.UTF_8
      );
    } catch (Exception e) {
      throw new IllegalStateException("Cannot read MFA secret", e);
    }
  }

  public long verify(String secret, String code, long lastStep) {
    if (code == null || !code.matches("\\d{6}")) return -1;
    long now = Instant.now().getEpochSecond() / 30;
    for (long step = now - 1; step <= now + 1; step++) if (
      step > lastStep &&
      MessageDigest.isEqual(
        code.getBytes(StandardCharsets.UTF_8),
        code(secret, step).getBytes(StandardCharsets.UTF_8)
      )
    ) return step;
    return -1;
  }

  public String code(String secret, long step) {
    try {
      Mac mac = Mac.getInstance("HmacSHA1");
      mac.init(new SecretKeySpec(decode32(secret), "HmacSHA1"));
      byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(step).array());
      int offset = hash[19] & 15;
      int number =
        ((hash[offset] & 127) << 24) |
        ((hash[offset + 1] & 255) << 16) |
        ((hash[offset + 2] & 255) << 8) |
        (hash[offset + 3] & 255);
      return String.format("%06d", number % 1000000);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  static String base32(byte[] bytes) {
    String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    StringBuilder out = new StringBuilder();
    int buffer = 0,
      bits = 0;
    for (byte b : bytes) {
      buffer = (buffer << 8) | (b & 255);
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        out.append(alphabet.charAt((buffer >> bits) & 31));
      }
    }
    if (bits > 0) out.append(alphabet.charAt((buffer << (5 - bits)) & 31));
    return out.toString();
  }

  static byte[] decode32(String value) {
    var out = new java.io.ByteArrayOutputStream();
    int buffer = 0,
      bits = 0;
    for (char c : value.toCharArray()) {
      int index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
      if (index < 0) throw new IllegalArgumentException();
      buffer = (buffer << 5) | index;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        out.write((buffer >> bits) & 255);
      }
    }
    return out.toByteArray();
  }
}
