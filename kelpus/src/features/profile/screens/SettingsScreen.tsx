import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import {useAuth} from '@features/auth/hooks/useAuth';
import {colors, typography, spacing} from '@theme/index';

export const SettingsScreen = () => {
  const {logout, deleteAccount, loading, deleteLoading, error} = useAuth();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleDeleteConfirm = () => {
    setConfirmingDelete(false);
    deleteAccount();
  };

  return (
    <View style={styles.container}>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleLogout} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.logoutText}>로그아웃</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {confirmingDelete ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmMessage}>
              정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmingDelete(false)}
                disabled={deleteLoading}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleDeleteConfirm}
                disabled={deleteLoading}>
                {deleteLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>탈퇴</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setConfirmingDelete(true)}
            disabled={deleteLoading}>
            {deleteLoading ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.deleteText}>회원 탈퇴</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.body1,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteText: {
    ...typography.body1,
    color: colors.error,
    fontWeight: '600',
  },
  confirmBox: {
    padding: spacing.md,
  },
  confirmMessage: {
    ...typography.body2,
    color: colors.text.primary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  confirmBtnText: {
    ...typography.body2,
    color: 'white',
    fontWeight: '600',
  },
});
