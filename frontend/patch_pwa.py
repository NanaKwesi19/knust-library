import os

# 1. Create useAutoSave.ts
hook_path = "C:/Users/hp/knust-library/frontend/src/hooks/useAutoSave.ts"
os.makedirs(os.path.dirname(hook_path), exist_ok=True)
hook_content = """import { useState, useEffect } from 'react';

export function useAutoSave<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn('Error reading localStorage', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error setting localStorage', error);
    }
  }, [key, value]);

  const clearSave = () => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error removing localStorage', error);
    }
  };

  return [value, setValue, clearSave];
}
"""
with open(hook_path, "w", encoding="utf-8") as f:
    f.write(hook_content)

# 2. Patch BookForm.tsx
form_path = "C:/Users/hp/knust-library/frontend/src/components/admin/inventory/BookForm.tsx"
with open(form_path, "r", encoding="utf-8") as f:
    form_content = f.read()

# Replace useState with useAutoSave
if "useAutoSave" not in form_content:
    form_content = form_content.replace(
        "import React, { useState } from 'react';",
        "import React, { useState } from 'react';\nimport { useAutoSave } from '../../../hooks/useAutoSave';"
    )
    
    old_state = """  const [formData, setFormData] = useState({"""
    new_state = """  const [formData, setFormData, clearFormData] = useAutoSave('knust_book_form', {"""
    form_content = form_content.replace(old_state, new_state)

    old_success = """      // Delay modal close so toast is visible
      setTimeout(() => {
        onSuccess();
      }, 300);"""
    new_success = """      clearFormData(); // Wipe the draft on successful submit
      
      // Delay modal close so toast is visible
      setTimeout(() => {
        onSuccess();
      }, 300);"""
    form_content = form_content.replace(old_success, new_success)

with open(form_path, "w", encoding="utf-8") as f:
    f.write(form_content)

# 3. Patch vite.config.ts for PWA
vite_path = "C:/Users/hp/knust-library/frontend/vite.config.ts"
with open(vite_path, "r", encoding="utf-8") as f:
    vite_content = f.read()

if "VitePWA" not in vite_content:
    vite_content = vite_content.replace(
        "import tailwindcss from '@tailwindcss/vite'",
        "import tailwindcss from '@tailwindcss/vite'\nimport { VitePWA } from 'vite-plugin-pwa'"
    )
    
    pwa_plugin = """    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'KNUST Smart Library',
        short_name: 'KNUST Lib',
        theme_color: '#800020',
        background_color: '#ffffff',
        display: 'standalone'
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\\/\\/api\\/v1\\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),"""
    
    vite_content = vite_content.replace(
        "tailwindcss(),",
        "tailwindcss(),\n" + pwa_plugin
    )

with open(vite_path, "w", encoding="utf-8") as f:
    f.write(vite_content)

print("PWA and useAutoSave hooked up.")
