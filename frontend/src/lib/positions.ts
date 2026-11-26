const POSITION_NAMES_VI: Record<string, string> = {
  "Koch/Köchin": "Đầu bếp",
  Koch: "Đầu bếp",
  Chef: "Bếp trưởng",
  Küche: "Bếp",
  Kitchen: "Bếp",
  Cook: "Đầu bếp",
  Servicekraft: "Phục vụ bàn",
  Server: "Phục vụ bàn",
  Waiter: "Phục vụ bàn",
  Barista: "Pha chế",
  Barkraft: "Pha chế",
  "Barista / Barkraft": "Pha chế",
  Spülkraft: "Rửa bát / Phụ bếp",
  Küchenhilfe: "Phụ bếp",
  "Spülkraft / Küchenhilfe": "Phụ bếp",
  Restaurantleitung: "Quản lý nhà hàng",
  "Restaurant Manager": "Quản lý nhà hàng",
  Schichtleitung: "Trưởng ca",
  "Shift Leader": "Trưởng ca",
  "HR-Referent/in": "Chuyên viên nhân sự",
  "HR Specialist": "Chuyên viên nhân sự",
};

export function formatPosition(
  name: string | undefined | null,
  lang: string,
): string {
  if (!name) return lang === "vi" ? "Nhân viên" : "Mitarbeiter/in";
  if (lang === "vi") {
    return POSITION_NAMES_VI[name] || name;
  }
  return name;
}
