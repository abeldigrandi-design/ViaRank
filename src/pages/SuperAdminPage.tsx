import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

type AdminUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  role?: string;
};

type AdminGroup = {
  id: string;
  name: string;
  sport: string;
  joinCode: string;
  visibility: "PUBLIC" | "PRIVATE";
  activityControlSpeed?: number | null;
  activityControlMinutes?: number | null;
  administrator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  _count?: {
    members: number;
  };
};

type GroupMember = {
  membershipId: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    role: string;
    isGroupAdministrator: boolean;
  };
};

type ActivityReview = {
  id: string;
  referenceSpeed: number;
  maximumMinutes: number;
  maxContinuousSeconds: number;
  needsReview: boolean;
  createdAt: string;
  activity: {
    id: string;
    source: string;
    type: string;
    name: string;
    distance: number;
    movingTime: number;
    startDate: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
};

type Props = {
  onBack: () => void;
  user: AdminUser | null;
  groups: AdminGroup[];
  groupsLoading: boolean;
  adminUsers: AdminUser[];
  adminUsersLoading: boolean;
  groupMembers: GroupMember[];
  groupMembersLoading: boolean;
  onOpenGroup: (group: AdminGroup) => Promise<void>;
};

const sportNames: Record<string, string> = {
  RIDE: "Ciclismo",
  RUN: "Carrera",
  SWIM: "Natación",
  HIKE: "Senderismo",
  WALK: "Caminata",
  WHEELCHAIR: "Silla de ruedas",
  KAYAK: "Kayak",
  ROW: "Remo",
  SAIL: "Vela",
  WINDSURF: "Windsurf",
};

export default function SuperAdminPage({
  onBack,
  user,
  groups,
  groupsLoading,
  adminUsers,
  adminUsersLoading,
  groupMembers,
  groupMembersLoading,
  onOpenGroup,
}: Props) {
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [activityControlSpeed, setActivityControlSpeed] = useState("");
  const [activityControlMinutes, setActivityControlMinutes] = useState("");
  const [savingActivityControl, setSavingActivityControl] = useState(false);
  const [activityControlMessage, setActivityControlMessage] = useState("");
  const [activityReviews, setActivityReviews] = useState<ActivityReview[]>([]);
  const [activityReviewsLoading, setActivityReviewsLoading] = useState(false);
  const [activityReviewsMessage, setActivityReviewsMessage] = useState("");

  const administeredGroups = groups
    .filter(
      (group) =>
        isSuperAdmin ||
        group.administrator.id === user?.id
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, "es", {
        sensitivity: "base",
      })
    );

  const sortedUsers = [...adminUsers].sort((a, b) => {
    const lastNameComparison = (a.lastName ?? "").localeCompare(
      b.lastName ?? "",
      "es",
      { sensitivity: "base" }
    );

    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    return (a.firstName ?? "").localeCompare(
      b.firstName ?? "",
      "es",
      { sensitivity: "base" }
    );
  });

  function toggleUser(userId: string) {
    setSelectedUsers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  function groupsAdministeredBy(userId: string) {
    return groups
      .filter((group) => group.administrator.id === userId)
      .map((group) => group.name);
  }

  async function loadActivityReviews(groupId: string) {
    setActivityReviewsLoading(true);
    setActivityReviewsMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/groups/${groupId}/activity-reviews`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "viarank_auth_token"
            )}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setActivityReviews([]);
        setActivityReviewsMessage(
          data.error || "No se pudieron cargar las actividades para revisar."
        );
        return;
      }

      setActivityReviews(
        Array.isArray(data.reviews)
          ? data.reviews.filter(
              (review: ActivityReview) => review.needsReview
            )
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando actividades para revisar:",
        error
      );
      setActivityReviews([]);
      setActivityReviewsMessage(
        "No se pudieron cargar las actividades para revisar."
      );
    } finally {
      setActivityReviewsLoading(false);
    }
  }

  async function openGroup(group: AdminGroup) {
    setSelectedGroup(group);
    setSelectedGroupMembers([]);
    setActivityControlSpeed(
      group.activityControlSpeed != null
        ? String(group.activityControlSpeed)
        : ""
    );
    setActivityControlMinutes(
      group.activityControlMinutes != null
        ? String(group.activityControlMinutes)
        : ""
    );
    setActivityControlMessage("");
    await Promise.all([
      onOpenGroup(group),
      loadActivityReviews(group.id),
    ]);
  }

  function closeGroup() {
    setSelectedGroup(null);
    setSelectedGroupMembers([]);
    setActivityControlSpeed("");
    setActivityControlMinutes("");
    setActivityControlMessage("");
    setActivityReviews([]);
    setActivityReviewsMessage("");
  }

  async function saveActivityControl() {
    if (!selectedGroup) {
      return;
    }

    const speed =
      activityControlSpeed.trim() === ""
        ? null
        : Number(activityControlSpeed);

    const minutes =
      activityControlMinutes.trim() === ""
        ? null
        : Number(activityControlMinutes);

    if (
      speed !== null &&
      (!Number.isFinite(speed) || speed < 0)
    ) {
      setActivityControlMessage(
        "Ingresá una velocidad válida."
      );
      return;
    }

    if (
      minutes !== null &&
      (!Number.isInteger(minutes) || minutes < 0)
    ) {
      setActivityControlMessage(
        "Ingresá un tiempo válido en minutos."
      );
      return;
    }

    setSavingActivityControl(true);
    setActivityControlMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/groups/${selectedGroup.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "viarank_auth_token"
            )}`,
          },
          body: JSON.stringify({
            activityControlSpeed: speed,
            activityControlMinutes: minutes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setActivityControlMessage(
          data.error ||
            "No se pudo guardar el control de actividad."
        );
        return;
      }

      setSelectedGroup((current) =>
        current
          ? {
              ...current,
              activityControlSpeed:
                data.group.activityControlSpeed,
              activityControlMinutes:
                data.group.activityControlMinutes,
            }
          : current
      );

      setActivityControlMessage("Guardado.");
    } catch (error) {
      console.error(
        "Error guardando control de actividad:",
        error
      );
      setActivityControlMessage(
        "No se pudo guardar el control de actividad."
      );
    } finally {
      setSavingActivityControl(false);
    }
  }

  function toggleGroupMember(userId: string) {
    setSelectedGroupMembers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0b3559 0%, #061a30 36%, #041426 100%)",
        color: "#f8fafc",
        padding: "14px 12px 80px",
        boxSizing: "border-box",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "620px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: "1px solid #148cff",
            background: "#071d38",
            color: "#ffffff",
            borderRadius: "10px",
            padding: "9px 14px",
            cursor: "pointer",
            fontWeight: 700,
            marginBottom: "16px",
          }}
        >
          ← Volver
        </button>

        <section
          style={{
            background:
              "linear-gradient(135deg, #071d38 0%, #0a2b50 55%, #0d3158 100%)",
            border: "1px solid #148cff",
            borderRadius: "18px",
            padding: "18px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.30)",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "1.4px",
              marginBottom: "5px",
            }}
          >
            VIARANK
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "26px",
              fontWeight: 900,
            }}
          >
            Administración
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#b8c7da",
              lineHeight: 1.4,
              fontSize: "12px",
            }}
          >
            {isSuperAdmin
              ? "Administración general de ViaRank."
              : "Administración de tus grupos ViaRank."}
          </p>
        </section>

        <section
          style={{
            background: "#061a30",
            border: "1px solid rgba(20,140,255,0.55)",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          {selectedGroup ? (
            <>
              <button
                type="button"
                onClick={closeGroup}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#38bdf8",
                  padding: "0",
                  margin: "0 0 10px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                ← Volver a grupos
              </button>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "19px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selectedGroup.name}
                  </h2>

                  <span
                    style={{
                      color: "#9fb5cc",
                      fontSize: "11px",
                    }}
                  >
                    {sportNames[selectedGroup.sport] ?? selectedGroup.sport}
                    {" · "}
                    {groupMembers.length} atletas
                  </span>
                </div>

                <span
                  style={{
                    color:
                      selectedGroupMembers.length > 0
                        ? "#38bdf8"
                        : "#9fb5cc",
                    background: "#082845",
                    border: "1px solid rgba(20,140,255,0.45)",
                    borderRadius: "8px",
                    padding: "5px 7px",
                    fontSize: "10px",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedGroupMembers.length} seleccionados
                </span>
              </div>

              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px",
                  borderRadius: "9px",
                  border: "1px solid rgba(20,140,255,0.38)",
                  background: "#071f39",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#ffffff",
                    marginBottom: "8px",
                  }}
                >
                  Control de actividad
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      color: "#9fb5cc",
                      fontSize: "10px",
                    }}
                  >
                    Velocidad de referencia
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={activityControlSpeed}
                        onChange={(e) => {
                          setActivityControlSpeed(e.target.value);
                          setActivityControlMessage("");
                        }}
                        style={{
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          border: "1px solid rgba(20,140,255,0.55)",
                          borderRadius: "7px",
                          background: "#082845",
                          color: "#ffffff",
                          padding: "6px 7px",
                          fontSize: "11px",
                          outline: "none",
                        }}
                      />
                      <span
                        style={{
                          color: "#9fb5cc",
                          fontSize: "10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        km/h
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      color: "#9fb5cc",
                      fontSize: "10px",
                    }}
                  >
                    Tiempo máximo
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={activityControlMinutes}
                        onChange={(e) => {
                          setActivityControlMinutes(e.target.value);
                          setActivityControlMessage("");
                        }}
                        style={{
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          border: "1px solid rgba(20,140,255,0.55)",
                          borderRadius: "7px",
                          background: "#082845",
                          color: "#ffffff",
                          padding: "6px 7px",
                          fontSize: "11px",
                          outline: "none",
                        }}
                      />
                      <span
                        style={{
                          color: "#9fb5cc",
                          fontSize: "10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        min
                      </span>
                    </div>
                  </label>
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    color: "#7892ad",
                    fontSize: "9px",
                    lineHeight: 1.3,
                  }}
                >
                  ViaRank marcará para revisión las actividades que superen
                  la velocidad de referencia durante más del tiempo máximo indicado.
                </div>

                <div
                  style={{
                    marginTop: "9px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void saveActivityControl()}
                    disabled={savingActivityControl}
                    style={{
                      border: "1px solid #148cff",
                      borderRadius: "7px",
                      background: savingActivityControl
                        ? "#123452"
                        : "#0b65b7",
                      color: "#ffffff",
                      padding: "6px 14px",
                      fontSize: "10px",
                      fontWeight: 800,
                      cursor: savingActivityControl
                        ? "default"
                        : "pointer",
                    }}
                  >
                    {savingActivityControl
                      ? "Guardando..."
                      : "Guardar"}
                  </button>

                  {activityControlMessage && (
                    <span
                      style={{
                        color:
                          activityControlMessage === "Guardado."
                            ? "#57d68d"
                            : "#ffb45c",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    >
                      {activityControlMessage}
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px",
                  borderRadius: "9px",
                  border: "1px solid rgba(255,180,92,0.45)",
                  background: "#071f39",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#ffffff",
                    marginBottom: "8px",
                  }}
                >
                  Actividades para revisar
                </div>

                {activityReviewsLoading ? (
                  <div
                    style={{
                      color: "#9fb5cc",
                      fontSize: "10px",
                    }}
                  >
                    Cargando...
                  </div>
                ) : activityReviewsMessage ? (
                  <div
                    style={{
                      color: "#ffb45c",
                      fontSize: "10px",
                    }}
                  >
                    {activityReviewsMessage}
                  </div>
                ) : activityReviews.length === 0 ? (
                  <div
                    style={{
                      color: "#7892ad",
                      fontSize: "10px",
                    }}
                  >
                    No hay actividades para revisar.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {activityReviews.map((review) => (
                      <div
                        key={review.id}
                        style={{
                          padding: "8px",
                          borderRadius: "7px",
                          background: "#082845",
                          border: "1px solid rgba(255,180,92,0.35)",
                        }}
                      >
                        <div
                          style={{
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 800,
                          }}
                        >
                          {review.activity.user.firstName}{" "}
                          {review.activity.user.lastName}
                        </div>

                        <div
                          style={{
                            color: "#9fb5cc",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          {review.activity.name} ·{" "}
                          {(review.activity.distance / 1000).toFixed(2)} km
                        </div>

                        <div
                          style={{
                            color: "#ffb45c",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          Superó {review.referenceSpeed} km/h durante{" "}
                          {review.maxContinuousSeconds} s · máximo configurado{" "}
                          {review.maximumMinutes} min
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {groupMembersLoading ? (
                <p style={{ color: "#9fb5cc", margin: 0 }}>
                  Cargando atletas...
                </p>
              ) : groupMembers.length === 0 ? (
                <p style={{ color: "#9fb5cc", margin: 0 }}>
                  Este grupo no tiene atletas.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}
                >
                  {[...groupMembers]
                    .sort((a, b) => {
                      const lastName = a.user.lastName.localeCompare(
                        b.user.lastName,
                        "es",
                        { sensitivity: "base" }
                      );

                      if (lastName !== 0) return lastName;

                      return a.user.firstName.localeCompare(
                        b.user.firstName,
                        "es",
                        { sensitivity: "base" }
                      );
                    })
                    .map((member) => {
                      const selected = selectedGroupMembers.includes(
                        member.user.id
                      );

                      return (
                        <label
                          key={member.membershipId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            padding: "5px 7px",
                            borderRadius: "7px",
                            border: selected
                              ? "1px solid #148cff"
                              : "1px solid rgba(20,140,255,0.30)",
                            background: selected
                              ? "#0a3156"
                              : "#082845",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleGroupMember(member.user.id)
                            }
                            style={{
                              width: "14px",
                              height: "14px",
                              margin: 0,
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          />

                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: "11px",
                            }}
                          >
                            <strong>
                              {member.user.lastName} {member.user.firstName}
                            </strong>

                            {member.user.isGroupAdministrator && (
                              <span
                                style={{
                                  color: "#38bdf8",
                                  fontWeight: 700,
                                }}
                              >
                                {" · Administrador"}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                </div>
              )}
            </>
          ) : (
            <>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: "19px",
                }}
              >
                {isSuperAdmin
                  ? "Grupos de ViaRank"
                  : "Mis grupos administrados"}
              </h2>

              {groupsLoading ? (
                <p style={{ color: "#9fb5cc", margin: 0 }}>
                  Cargando grupos...
                </p>
              ) : administeredGroups.length === 0 ? (
                <p style={{ color: "#9fb5cc", margin: 0 }}>
                  No hay grupos para administrar.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}
                >
                  {administeredGroups.map((group) => (
                    <button
                      type="button"
                      key={group.id}
                      onClick={() => void openGroup(group)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                        padding: "5px 8px",
                        borderRadius: "7px",
                        border: "1px solid rgba(20,140,255,0.48)",
                        background: "#082845",
                        color: "#ffffff",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "12px",
                        }}
                      >
                        <strong>{group.name}</strong>
                        <span style={{ color: "#9fb5cc" }}>
                          {" · "}
                          {sportNames[group.sport] ?? group.sport}
                          {" · "}
                          {group.visibility === "PUBLIC"
                            ? "Público"
                            : "Privado"}
                          {" · "}
                          {group._count?.members ?? 0} atletas
                        </span>
                      </span>

                      <span
                        style={{
                          color: "#38bdf8",
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {isSuperAdmin && !selectedGroup && (
          <section
            style={{
              background: "#061a30",
              border: "1px solid rgba(20,140,255,0.55)",
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: "0 0 4px",
                    fontSize: "19px",
                  }}
                >
                  Usuarios de ViaRank
                </h2>

                <span
                  style={{
                    color: "#9fb5cc",
                    fontSize: "12px",
                  }}
                >
                  {adminUsersLoading
                    ? "Cargando usuarios..."
                    : `${sortedUsers.length} usuarios`}
                </span>
              </div>

              <span
                style={{
                  color:
                    selectedUsers.length > 0
                      ? "#38bdf8"
                      : "#9fb5cc",
                  background: "#082845",
                  border: "1px solid rgba(20,140,255,0.45)",
                  borderRadius: "8px",
                  padding: "6px 8px",
                  fontSize: "11px",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {selectedUsers.length} seleccionados
              </span>
            </div>

            {!adminUsersLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                {sortedUsers.map((adminUser) => {
                  const selected = selectedUsers.includes(adminUser.id);
                  const managedGroups =
                    groupsAdministeredBy(adminUser.id);

                  return (
                    <label
                      key={adminUser.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "11px",
                        padding: "4px 7px",
                        borderRadius: "7px",
                        border: selected
                          ? "1px solid #148cff"
                          : "1px solid rgba(20,140,255,0.30)",
                        background: selected
                          ? "#0a3156"
                          : "#082845",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleUser(adminUser.id)}
                        style={{
                          width: "14px",
                          height: "14px",
                          marginTop: "1px",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />

                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "11px",
                          lineHeight: 1.2,
                        }}
                      >
                        <strong style={{ color: "#ffffff" }}>
                          {adminUser.lastName ?? ""}{" "}
                          {adminUser.firstName ?? ""}
                        </strong>

                        {adminUser.email && (
                          <span style={{ color: "#9fb5cc" }}>
                            {" · "}
                            {adminUser.email}
                          </span>
                        )}

                        {managedGroups.length > 0 && (
                          <span
                            style={{
                              color: "#38bdf8",
                              fontWeight: 700,
                            }}
                          >
                            {" · Administrador de: "}
                            {managedGroups.join(" · ")}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
