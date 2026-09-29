import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../lib/googleMaps'

function AddressPicker({
  value,
  onChange,
  disabled = false,
}) {
  const containerRef = useRef(null)
  const autocompleteRef = useRef(null)
  const onChangeRef = useRef(onChange)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false
    let autocomplete = null

    async function initAutocomplete() {
      try {
        setLoading(true)
        setError('')

        await loadGoogleMaps()

        if (cancelled) {
          return
        }

        const { PlaceAutocompleteElement } =
          await window.google.maps.importLibrary(
            'places'
          )

        if (cancelled) {
          return
        }

        autocomplete =
          new PlaceAutocompleteElement()

        autocomplete.placeholder =
          'Search for an address...'

        autocomplete.setAttribute(
          'included-region-codes',
          'id'
        )

        autocomplete.setAttribute(
          'requested-language',
          'en'
        )

        autocomplete.disabled = disabled

        async function handlePlaceSelect(
          event
        ) {
          try {
            const place =
              event.placePrediction.toPlace()

            await place.fetchFields({
              fields: [
                'formattedAddress',
                'location',
              ],
            })

            const address =
              place.formattedAddress || ''

            const latitude =
              place.location?.lat?.() ?? null

            const longitude =
              place.location?.lng?.() ?? null

            if (
              !address ||
              latitude === null ||
              longitude === null
            ) {
              setError(
                'The selected place does not have complete location data.'
              )
              return
            }

            setError('')

            onChangeRef.current({
              address,
              latitude,
              longitude,
            })
          } catch (error) {
            console.error(
              'Failed to retrieve place details:',
              error
            )

            setError(
              'Failed to retrieve the selected address.'
            )
          }
        }

        autocomplete.addEventListener(
          'gmp-select',
          handlePlaceSelect
        )

        autocompleteRef.current =
          autocomplete

        containerRef.current?.appendChild(
          autocomplete
        )

        if (value) {
          autocomplete.value = value
        }

        setLoading(false)
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(
          'Failed to initialize Google Places:',
          error
        )

        setError(
          error.message ||
            'Failed to load address search.'
        )

        setLoading(false)
      }
    }

    initAutocomplete()

    return () => {
      cancelled = true

      if (autocomplete) {
        autocomplete.remove()
      }

      autocompleteRef.current = null
    }
  }, [])

  useEffect(() => {
    if (
      autocompleteRef.current &&
      value
    ) {
      autocompleteRef.current.value =
        value
    }
  }, [value])

  useEffect(() => {
    if (autocompleteRef.current) {
      autocompleteRef.current.disabled =
        disabled
    }
  }, [disabled])

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
        }}
      />

      {loading && (
        <div className="form-help">
          Loading address search...
        </div>
      )}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}
    </div>
  )
}

export default AddressPicker
