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
      if (
        window.google?.maps?.importLibrary
      ) {
        resolve(window.google.maps)
        return
      }

      const callbackName =
        '__googleMapsInit'

      window[callbackName] = () => {
        delete window[callbackName]

        if (
          window.google?.maps?.importLibrary
        ) {
          resolve(window.google.maps)
        } else {
          reject(
            new Error(
              'Google Maps loaded, but importLibrary is unavailable.'
            )
          )
        }
      }

      const script =
        document.createElement('script')

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&loading=async&callback=${callbackName}`

      script.async = true
      script.defer = true

      script.onerror = () => {
        delete window[callbackName]
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
