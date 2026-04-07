export const translations = {
  zh: {
    // Login Page
    login: '登录',
    loginTitle: '登录',
    email: '邮箱',
    password: '密码',
    enterEmail: '请输入邮箱',
    enterPassword: '请输入密码',
    loginButton: '登录',
    loggingIn: '登录中...',
    loginFailed: '登录失败',
    checkEmailPassword: '请检查邮箱和密码',
    noAccount: '还没有账户？',
    registerNow: '立即注册',
    
    // Register Page
    register: '注册',
    registerTitle: '注册',
    name: '姓名',
    enterName: '请输入姓名',
    role: '角色',
    selectRole: '选择角色',
    student: '学生',
    teacher: '教师',
    confirmPassword: '确认密码',
    enterPassword: '请输入密码',
    confirmPasswordPlaceholder: '请再次输入密码',
    passwordMismatch: '密码确认不匹配',
    registerButton: '注册',
    registering: '注册中...',
    registerFailed: '注册失败',
    tryAgain: '请重试',
    hasAccount: '已有账户？',
    loginNow: '立即登录',
    
    // Common
    language: '语言',
    chinese: '中文',
    english: 'English',
  },
  en: {
    // Login Page
    login: 'Login',
    loginTitle: 'Login',
    email: 'Email',
    password: 'Password',
    enterEmail: 'Please enter your email',
    enterPassword: 'Please enter your password',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    loginFailed: 'Login Failed',
    checkEmailPassword: 'Please check your email and password',
    noAccount: "Don't have an account?",
    registerNow: 'Register Now',
    
    // Register Page
    register: 'Register',
    registerTitle: 'Register',
    name: 'Name',
    enterName: 'Please enter your name',
    role: 'Role',
    selectRole: 'Select Role',
    student: 'Student',
    teacher: 'Teacher',
    confirmPassword: 'Confirm Password',
    enterPassword: 'Please enter password',
    confirmPasswordPlaceholder: 'Please enter password again',
    passwordMismatch: 'Password confirmation does not match',
    registerButton: 'Register',
    registering: 'Registering...',
    registerFailed: 'Register Failed',
    tryAgain: 'Please try again',
    hasAccount: 'Already have an account?',
    loginNow: 'Login Now',
    
    // Common
    language: 'Language',
    chinese: '中文',
    english: 'English',
  }
};

export const getTranslation = (language, key) => {
  return translations[language]?.[key] || translations.zh[key] || key;
};
