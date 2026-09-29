import { useEffect, useRef, useState } from 'react'

function AddressPicker({
  value,
  onChange,
  disabled = false,
}) {
  const containerRef = useRef(null)
  const autocompleteRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function initAutocomplete() {
      try {
        setLoading(true)
        setError('')

        if (!window.google?.maps) {
          throw new Error(
            'Google Maps JavaScript API is not loaded.'
          )
        }

        const { PlaceAutocompleteElement } =
          await window.google.maps.importLibrary(
            'places'
          )

        if (cancelled) {
          return
        }

        const autocomplete =
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

        autocompleteRef.current =
          autocomplete

        containerRef.current?.appendChild(
          autocomplete
        )

        autocomplete.addEventListener(
          'gmp-select',
          handlePlaceSelect
        )

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

        onChange({
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

    initAutocomplete()

    return () => {
      cancelled = true

      if (autocompleteRef.current) {
        autocompleteRef.current.removeEventListener(
          'gmp-select',
          handlePlaceSelect
        )

        autocompleteRef.current.remove()
        autocompleteRef.current = null
      }
    }
  }, [onChange])

  useEffect(() => {
    if (
      autocompleteRef.current &&
      value
    ) {
      autocompleteRef.current.value =
        value
    }
  }, [value])

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
