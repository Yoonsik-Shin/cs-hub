import {
  Loader2,
  Plus,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import type { AdminAccount, CreateAccountRequest } from "../api/inquiryApi";
import { accountApi } from "../api/inquiryApi";
import { ModalSurface } from "./ui/ModalSurface";
import { ACCOUNT_POLICY, validateAccountDraft } from "../features/account/policy";
import { InlineAlert } from "./ui/InlineAlert";
import { getErrorMessage } from "../lib/errors";

interface AccountManagementModalProps {
  onClose: () => void;
  currentUsername: string;
}

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  onClose,
  currentUsername,
}) => {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState<
    string | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
  const [createError, setCreateError] = useState("");

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountApi.getAccounts();
      setAccounts(data);
    } catch (err) {
      setError("계정 목록을 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    accountApi.getAccounts()
      .then((data) => {
        if (active) setAccounts(data);
      })
      .catch((err: unknown) => {
        if (active) setError("계정 목록을 불러오는 데 실패했습니다.");
        console.error(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resetCreateForm = () => {
    setNewUsername("");
    setNewPassword("");
    setNewNickname("");
    setNewEmail("");
    setNewRole("OPERATOR");
    setCreateError("");
  };

  const handleCreate = async () => {
    setCreateError("");
    const validationError = validateAccountDraft({
      username: newUsername,
      password: newPassword,
      nickname: newNickname,
      email: newEmail,
    });
    if (validationError) {
      setCreateError(validationError);
      return;
    }
    setActionLoading(true);
    try {
      const request: CreateAccountRequest = {
        username: newUsername.trim(),
        password: newPassword,
        nickname: newNickname.trim(),
        email: newEmail.trim(),
        role: newRole,
      };
      await accountApi.createAccount(request);
      resetCreateForm();
      setShowCreateForm(false);
      fetchAccounts();
    } catch (err) {
      setCreateError(getErrorMessage(err, "계정 생성에 실패했습니다."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (username: string) => {
    setActionLoading(true);
    try {
      await accountApi.deleteAccount(username);
      setDeleteConfirmUsername(null);
      fetchAccounts();
    } catch (err) {
      setError(getErrorMessage(err, "계정 삭제에 실패했습니다."));
    } finally {
      setActionLoading(false);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "최고 관리자";
      case "OPERATOR":
        return "일반 운영자";
      default:
        return role;
    }
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 700,
    background:
      role === "ADMIN" ? "rgba(239, 68, 68, 0.08)" : "rgba(99, 102, 241, 0.08)",
    color: role === "ADMIN" ? "#ef4444" : "var(--accent-indigo)",
    border: `1px solid ${role === "ADMIN" ? "rgba(239, 68, 68, 0.2)" : "rgba(99, 102, 241, 0.2)"}`,
  });

  return (
    <ModalSurface
      title="계정 관리"
      onClose={onClose}
      closeDisabled={actionLoading}
      contentClassName="modal-container"
      contentStyle={{
          width: "90%",
          maxWidth: "640px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "12px",
          background: "#ffffff",
          border: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
          animation: "scaleUp var(--transition-fast) forwards",
      }}
    >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-light)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background:
                  "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={16} style={{ color: "var(--accent-indigo)" }} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                계정 관리
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "11.5px",
                  color: "var(--text-muted)",
                }}
              >
                관리자 및 운영자 계정을 추가하거나 삭제합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            aria-label="계정 관리창 닫기"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {error && <InlineAlert className="account-modal-alert">{error}</InlineAlert>}

          {/* Account List */}
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px 0",
                color: "var(--text-muted)",
              }}
            >
              <Loader2 size={24} className="spin" />
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {accounts.map((account) => (
                <div
                  key={account.username}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-light)",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        background:
                          account.role === "ADMIN"
                            ? "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1))"
                            : "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {account.role === "ADMIN" ? (
                        <Shield size={15} style={{ color: "#ef4444" }} />
                      ) : (
                        <User
                          size={15}
                          style={{ color: "var(--accent-indigo)" }}
                        />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {account.nickname}
                        </span>
                        <span style={roleBadgeStyle(account.role)}>
                          {roleLabel(account.role)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {account.username}
                        {account.email ? ` · ${account.email}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  {account.username !== "runday-cs-admin" &&
                    account.username !== currentUsername &&
                    (deleteConfirmUsername === account.username ? (
                      <div
                        style={{ display: "flex", gap: "6px", flexShrink: 0 }}
                      >
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleDelete(account.username)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {actionLoading ? (
                            <Loader2 size={12} className="spin" />
                          ) : (
                            "확인"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmUsername(null)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-light)",
                            background: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirmUsername(account.username)
                        }
                        title="계정 삭제"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "6px",
                          borderRadius: "6px",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = "#ef4444";
                          e.currentTarget.style.background =
                            "rgba(239, 68, 68, 0.06)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = "var(--text-muted)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "10px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-light)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                신규 계정 등록
              </h3>
              {createError && <InlineAlert className="account-modal-alert">{createError}</InlineAlert>}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    아이디 *
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    maxLength={ACCOUNT_POLICY.username.maxLength}
                    placeholder="영문, 숫자, -, _ 가능"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-light)",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    비밀번호 *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={ACCOUNT_POLICY.password.minLength}
                    maxLength={ACCOUNT_POLICY.password.maxLength}
                    placeholder="6자 이상"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-light)",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    표시 이름 *
                  </label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    maxLength={ACCOUNT_POLICY.nickname.maxLength}
                    placeholder="예: 운영팀 김씨"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-light)",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    이메일
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    maxLength={ACCOUNT_POLICY.email.maxLength}
                    placeholder="선택사항"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-light)",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "10px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    marginBottom: "4px",
                    display: "block",
                  }}
                >
                  역할 *
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["OPERATOR", "ADMIN"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewRole(role)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "12px",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        border:
                          newRole === role
                            ? role === "ADMIN"
                              ? "1.5px solid rgba(239, 68, 68, 0.4)"
                              : "1.5px solid rgba(99, 102, 241, 0.4)"
                            : "1px solid var(--border-light)",
                        background:
                          newRole === role
                            ? role === "ADMIN"
                              ? "rgba(239, 68, 68, 0.06)"
                              : "rgba(99, 102, 241, 0.06)"
                            : "var(--bg-primary)",
                        color:
                          newRole === role
                            ? role === "ADMIN"
                              ? "#ef4444"
                              : "var(--accent-indigo)"
                            : "var(--text-muted)",
                      }}
                    >
                      {role === "ADMIN" ? (
                        <Shield size={13} />
                      ) : (
                        <User size={13} />
                      )}
                      {roleLabel(role)}
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "14px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetCreateForm();
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-light)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCreate}
                  className="btn-primary"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {actionLoading ? (
                    <Loader2 size={13} className="spin" />
                  ) : (
                    <Plus size={13} />
                  )}
                  등록
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showCreateForm && (
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--border-light)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="btn-primary glow-violet-hover"
              onClick={() => setShowCreateForm(true)}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Plus size={15} /> 신규 계정 등록
            </button>
          </div>
        )}
    </ModalSurface>
  );
};
