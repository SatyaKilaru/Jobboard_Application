import * as yup from 'yup'

export const loginSchema = yup.object({
  email: yup.string().email('Please enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
})

export const registerSchema = yup.object({
  email: yup.string().email('Please enter a valid email').required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Za-z]/, 'Password must contain at least one letter')
    .matches(/\d/, 'Password must contain at least one number')
    .required('Password is required'),
  full_name: yup.string().required('Full name is required'),
})
