let googleMapsPromise = null

export function loadGoogleMaps() {
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return Promise.reject(
      new Error(
        'VITE_GOOGLE_MAPS_API_KEY is not configured.'
      )
    )
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      if (window.google?.maps) {
        resolve(window.google.maps)
        return
      }

      const script =
        document.createElement('script')

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&libraries=places&loading=async`

      script.async = true
      script.defer = true

      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google.maps)
        } else {
          reject(
            new Error(
              'Google Maps loaded, but the Maps API is unavailable.'
            )
          )
        }
      }

      script.onerror = () => {
        googleMapsPromise = null

        reject(
          new Error(
            'Failed to load Google Maps.'
          )
        )
      }

      document.head.appendChild(script)
    }
  )

  return googleMapsPromise
}
