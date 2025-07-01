import { APP_ADMIN_EMAIL, APP_ADMIN_PASSWORD, APP_ADMIN_USERNAME } from "src/config";

export const USERS = [
    {
        username: APP_ADMIN_USERNAME ?? 'admin',
        email: APP_ADMIN_EMAIL ?? 'admin@gmail.com',
        password: APP_ADMIN_PASSWORD ?? 'admin',
    }
]

export const CATEGORY = [
    {
        name: 'Others'
    }
]

export const EMAIL_PARAMS = [
    {
        key: "verifyEmail",
        label: "Register New Account Email",
        subject: "Congratulations, You have successfully registered an new account!",
        title: "You New Account, {{dynamicUsernam}} had successfully registered!",
        description: "We are thrilled to inform you that you account is all set. You can start your registration now!",
        btnText: "Login Now !"
    },
    {
        key: "resetOtp",
        label: "Forgot and Reset Password Email",
        subject: "Reset Password OTP",
        title: "Hi {{dynamicUsername}}",
        description: "You recently requested to reset you password for your {{dynamicEventName}} account. Click the button below to reset it. This code is valid for only 10 minutes.",
        footer: "If you did not request a password reset, please ignore this email.",
        btnText: "Your Verification Code"
    }
]