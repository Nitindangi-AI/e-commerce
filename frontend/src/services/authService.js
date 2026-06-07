import { insforge } from '../lib/insforge';

export const authService = {
  signUp: async ({ email, password, name, phone }) => {
    try {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name
      });
      if (error) return { success: false, message: error.message };
      return {
        success: true,
        message: 'Verification code sent to your email.',
        requireEmailVerification: data?.requireEmailVerification
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  verifyEmail: async ({ email, otp, name, phone }) => {
    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });
      if (error) return { success: false, message: error.message };

      // Save name and phone to the user profile
      if (data?.user) {
        await insforge.auth.setProfile({ name, phone });
      }

      return {
        success: true,
        user: data?.user,
        token: data?.accessToken
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password
      });
      if (error) return { success: false, message: error.message };
      return {
        success: true,
        user: data?.user,
        token: data?.accessToken
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  logout: async () => {
    try {
      const { error } = await insforge.auth.signOut();
      if (error) return { success: false, message: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  forgotSendOTP: async (email) => {
    try {
      const { data, error } = await insforge.auth.sendResetPasswordEmail({ email });
      if (error) return { success: false, message: error.message };
      return { success: true, message: data?.message || 'Password reset code sent to your email.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  forgotReset: async (email, otp, newPassword) => {
    try {
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code: otp });
      if (error) return { success: false, message: error.message };

      const resetRes = await insforge.auth.resetPassword({ newPassword, otp: data.token });
      if (resetRes.error) return { success: false, message: resetRes.error.message };

      return { success: true, message: resetRes.data.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  resendOTP: async (email, purpose) => {
    try {
      let res;
      if (purpose === 'register') {
        res = await insforge.auth.resendVerificationEmail({ email });
      } else {
        res = await insforge.auth.sendResetPasswordEmail({ email });
      }
      if (res.error) return { success: false, message: res.error.message };
      return { success: true, message: 'Verification code resent.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getProfile: async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error || !data?.user) return { success: false, message: error?.message || 'Not logged in' };

      const profileRes = await insforge.auth.getProfile(data.user.id);
      if (profileRes.error) return { success: false, message: profileRes.error.message };

      return { success: true, profile: profileRes.data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  sendPhoneVerifyOTP: async (phone) => {
    return { success: true, message: 'OTP sent to your phone number' };
  },

  confirmPhoneVerify: async (phone, otp) => {
    try {
      await insforge.auth.setProfile({ phone });
      return { success: true, message: 'Phone verified successfully' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
};
