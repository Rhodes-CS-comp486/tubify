import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"
import { useState, useContext, useEffect, useRef } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import api, { AxiosError } from "@/lib/axios"
import { z } from "zod"
import { AuthContext } from "@/contexts/auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Eye, EyeOff } from "lucide-react"
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().min(1, "email or username is required"),
  password: z.string().min(1, "password is required"),
})

const registerSchema = z.object({
  email: z.string().email("please enter a valid email address"),
  username: z.string()
    .min(3, "username must be at least 3 characters")
    .max(50, "username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "username can only contain letters, numbers, periods, underscores, and hyphens"),
  password: z.string()
    .min(8, "password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&+])[A-Za-z\d@$!%*#?&+]{8,}$/,
      "password must contain at least one letter, one number, and one special character"
    ),
})

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "login" | "register"
}

export default function AuthPage() {
  const [authType, setAuthType] = useState<"login" | "register">("login")
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const [errors, setErrors] = useState<{
    login?: string
    register?: string
    oauth?: string
  }>({})
  const processingRef = useRef(false)

  useEffect(() => {
    // extract code from URL
    const urlParams = new URLSearchParams(location.search)
    const code = urlParams.get("code")
    const error = urlParams.get("error")

    if (error) {
      setErrors(prev => ({
        ...prev,
        oauth: `Authentication failed: ${error}`
      }))
      navigate("/auth")
      return
    }

    if (code && !processingRef.current) {
      const handleOAuthCallback = async () => {
        if (processingRef.current) return
        processingRef.current = true
        
        // create a single toast with an ID
        const toastId = toast.loading("Processing authentication...", {
          id: "oauth-processing"
        })

        try {
          // clear the URL to prevent reuse of the code
          window.history.replaceState({}, document.title, "/auth")
          
          const provider = location.pathname.includes("google")
            ? "google"
            : "github"
            
          const response = await api.get(`/api/auth/${provider}/callback`, {
            params: { code }
          })

          if (response.data?.message === "Authentication successful") {
            // dismiss the loading toast
            toast.dismiss(toastId)
            login()
            navigate("/")
          } else {
            throw new Error("Authentication response was not successful")
          }
        } catch (error) {
          // dismiss the loading toast
          toast.dismiss(toastId)
          
          if (process.env.NODE_ENV === "development") {
            console.error("OAuth callback failed:", error)
          }
          const axiosError = error as AxiosError<{ detail: string }>
          const errorMessage = axiosError.response?.data?.detail || "Authentication failed. Please try again."
          if (process.env.NODE_ENV === "development") {
            console.error("Detailed error:", errorMessage)
          }
          setErrors(prev => ({
            ...prev,
            oauth: errorMessage
          }))
        } finally {
          // dismiss the loading toast if it's still showing
          toast.dismiss("oauth-processing")
          processingRef.current = false
        }
      }
      
      handleOAuthCallback()
    }
  }, [location, login, navigate])
  
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {errors?.oauth && (
        <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errors.oauth}
        </div>
      )}
      <div className="hidden lg:block bg-zinc-900">
        <div className="flex h-full flex-col">
          <div className="flex items-center text-lg p-10 font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <Link to="/" className="hover:text-slate-300">
              Tubify
            </Link>
          </div>
          <div className="mt-auto p-10">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Transform your Spotify experience with Tubify.&rdquo;
              </p>
            </blockquote>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-black">
        <div className="mx-auto w-full max-w-sm px-8">
          <div className="flex flex-col text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              {authType === "login" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-sm py-2">
              {authType === "login" 
                ? "Enter your credentials to sign in" 
                : "Enter your information to create an account"}
            </p>
          </div>
          <UserAuthForm type={authType} />
          <p className="px-8 text-center text-sm">
            {authType === "login" ? (
              <>
                <br />Don't have an account?&nbsp;&nbsp;
                <Button 
                  variant="outline"               
                  onClick={() => setAuthType("register")}
                >
                  Sign up
                </Button>
              </>
            ) : (
              <>
                <br />Have an account?&nbsp;&nbsp;
                <Button 
                  variant="outline"
                  onClick={() => setAuthType("login")}
                >
                  Sign in
                </Button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function UserAuthForm({ type, ...props }: UserAuthFormProps): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const usernameCheckTimeout = useRef<NodeJS.Timeout>()

  // use a different form based on the type
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  })

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
    mode: "onChange",
  })

  // check username availability
  useEffect(() => {
    if (type !== "register") return

    const username = registerForm.watch("username")
    if (!username || username.length < 3) return

    // clear any existing timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current)
    }

    // set a new timeout to check username
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        setIsCheckingUsername(true)
        const response = await api.get(`/api/auth/check-username/${username}`)
        if (!response.data.available) {
          registerForm.setError("username", {
            type: "manual",
            message: "this username is already taken"
          })
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to check username:", error)
        }
      } finally {
        setIsCheckingUsername(false)
      }
    }, 500) // debounce for 500ms

    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current)
      }
    }
  }, [type, registerForm])

  async function onSubmit() {
    // validate form first
    const isValid = type === "login" 
      ? await loginForm.trigger() 
      : await registerForm.trigger()
      
    if (!isValid) {
      return
    }
    
    setIsLoading(true)

    try {
      const endpoint = type === "login" ? "/api/auth/login" : "/api/auth/register"
      
      if (type === "login") {
        try {
          const loginData = loginForm.getValues()
          // for login, use URLSearchParams format as required by OAuth2PasswordRequestForm
          const params = new URLSearchParams()
          params.append("username", loginData.email) // email field contains either email or username
          params.append("password", loginData.password)
          
          const response = await api.post(endpoint, params, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
          
          if (!response.data?.access_token) {
            throw new Error("no access token received")
          }
          
          // only navigate if login is successful
          await login()
          navigate("/")
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("login error:", err)
          }
          
          // prevent any navigation for a few seconds
          setIsLoading(false)
          
          if (err instanceof AxiosError) {
            const errorMessage = err.response?.data?.detail || "authentication failed"
            toast.error(errorMessage, {
              duration: 10000, 
              id: "login-error"
            })
          } else {
            toast.error("something went wrong with login", {
              duration: 10000,
              id: "login-error" 
            })
          }

          return
        }
      } else {
        // for register, use JSON format
        try {
          const registerData = registerForm.getValues()
          await api.post(endpoint, registerData)
          // only navigate if registration is successful
          await login()
          navigate("/")
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("registration error:", err)
          }
          
          setIsLoading(false)
          
          if (err instanceof AxiosError) {
            const errorMessage = err.response?.data?.detail || "registration failed"
            toast.error(errorMessage, {
              duration: 10000, 
              id: "registration-error"
            })
          } else {
            toast.error("something went wrong with registration", {
              duration: 10000, 
              id: "registration-error"
            })
          }
          
          return
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("form submission error:", err)
      }
      
      setIsLoading(false)
      
      toast.error("something went wrong with the form submission", {
        duration: 10000, 
        id: "form-error"
      })
      
      return
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: "google" | "github") => {
    try {
      const response = await api.get(`/api/auth/${provider}`)
      window.location.href = response.data.url
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error(err)
      }
      
      toast.error("failed to initialize oauth login", {
        duration: 10000, 
        id: "oauth-error"
      })
    }
  }

  return (
    <div className="grid gap-6" {...props}>
      {type === "login" ? (
        <Form {...loginForm}>
          <div className="space-y-2">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="name@example.com or username"
                      type="text"
                      autoCapitalize="none"
                      autoComplete="username"
                      autoCorrect="off"
                      disabled={isLoading}
                      className={`${loginForm.formState.errors.email ? 'border-red-500 hover:border-red-600 focus:border-red-600' : ''}`}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="********"
                        type={showPassword ? "text" : "password"}
                        autoCapitalize="none"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className={`pr-10 ${loginForm.formState.errors.password ? 'border-red-500 hover:border-red-600 focus:border-red-600' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                  <Link 
                    to="/reset-password"
                    className="text-sm hover:text-slate-300 block"
                  >
                    forgot password?
                  </Link>
                </FormItem>
              )}
            />
          </div>
        </Form>
      ) : (
        <Form {...registerForm}>
          <div className="space-y-2">
            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="johndoe"
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        disabled={isLoading}
                        className={`${registerForm.formState.errors.username ? 'border-red-500 hover:border-red-600 focus:border-red-600' : ''}`}
                      />
                      {isCheckingUsername && (
                        <Icons.spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-500" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            
            <FormField
              control={registerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="name@example.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading}
                      className={`${registerForm.formState.errors.email ? 'border-red-500 hover:border-red-600 focus:border-red-600' : ''}`}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="********"
                        type={showPassword ? "text" : "password"}
                        autoCapitalize="none"
                        autoComplete="new-password"
                        disabled={isLoading}
                        className={`pr-10 ${registerForm.formState.errors.password ? 'border-red-500 hover:border-red-600 focus:border-red-600' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
          </div>
        </Form>
      )}

      <Button 
        type="button" 
        className="w-full"
        disabled={isLoading}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onSubmit()
          return false
        }}
      >
        {isLoading && (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        )}
        {type === "login" ? "Sign in" : "Sign up"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-900" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-black px-2">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => handleOAuthLogin("google")}
          variant="outline"
          disabled={isLoading}
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}
          Google
        </Button>
        <Button 
          onClick={() => handleOAuthLogin("github")} 
          variant="outline"
          disabled={isLoading}
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.gitHub className="mr-2 h-4 w-4" />
          )}
          GitHub
        </Button>
      </div>
    </div>
  )
}