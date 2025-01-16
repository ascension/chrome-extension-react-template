import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config'

export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      storage: {
        getItem: async (key: string) => {
          const { [key]: value } = await chrome.storage.local.get(key)
          return value
        },
        setItem: async (key: string, value: string) => {
          await chrome.storage.local.set({ [key]: value })
        },
        removeItem: async (key: string) => {
          await chrome.storage.local.remove(key)
        },
      },
      autoRefreshToken: true,
      persistSession: true,
    },
  }
)

// Helper function to generate the OAuth URL
export const generateOAuthUrl = () => {
  const provider = 'google'
  const redirectTo = chrome.identity.getRedirectURL()
  
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  })
}

// Function to handle Chrome extension authentication
export const handleChromeAuth = async () => {
  try {
    const { data: { url } } = await generateOAuthUrl()
    
    if (!url) throw new Error('Failed to generate auth URL')

    // Launch Chrome's OAuth flow
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url,
          interactive: true,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else if (response) {
            resolve(response)
          } else {
            reject(new Error('No response from auth flow'))
          }
        }
      )
    })

    // Exchange the OAuth code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      responseUrl
    )

    if (error) throw error

    return data.session
  } catch (error) {
    console.error('Auth error:', error)
    throw error
  }
}

// Function to handle logout
export const handleLogout = async () => {
  await supabase.auth.signOut()
  await chrome.storage.local.remove('supabase.auth.token')
}

// Function to get current session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  
  return session
}