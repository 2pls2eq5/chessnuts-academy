import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../lib/googleMaps'

function AddressPicker({
  value,
  latitude,
  longitude,
  onChange,
  disabled = false,
}) {
  const searchContainerRef = useRef(null)
  const mapContainerRef = useRef(null)

  const autocompleteRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const onChangeRef = useRef(onChange)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false
    let autocomplete = null
    let marker = null
    let dragListener = null

    async function init() {
      try {
        setLoading(true)
        setError('')

        await loadGoogleMaps()

        if (cancelled) {
          return
        }

        const [
          { Map },
          { AdvancedMarkerElement },
          { PlaceAutocompleteElement },
        ] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('marker'),
          window.google.maps.importLibrary('places'),
        ])

        if (cancelled) {
          return
        }

        /*
         * Initial map position.
         *
         * If the profile already has coordinates,
         * use them.
         *
         * Otherwise start around Jakarta.
         */
        const initialPosition =
          latitude !== null &&
          latitude !== undefined &&
          longitude !== null &&
          longitude !== undefined
            ? {
                lat: Number(latitude),
                lng: Number(longitude),
              }
            : {
                lat: -6.2088,
                lng: 106.8456,
              }

        const map = new Map(
          mapContainerRef.current,
          {
            center: initialPosition,
            zoom:
              latitude !== null &&
              latitude !== undefined &&
              longitude !== null &&
              longitude !== undefined
                ? 17
                : 11,
            mapId: 'DEMO_MAP_ID',
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }
        )

        mapRef.current = map

        /*
         * Create draggable marker.
         */
        marker = new AdvancedMarkerElement({
          map,
          position:
            latitude !== null &&
            latitude !== undefined &&
            longitude !== null &&
            longitude !== undefined
              ? initialPosition
              : null,
          gmpDraggable: true,
          title: 'Drag to adjust location',
        })

        markerRef.current = marker

        /*
         * When user finishes dragging the pin,
         * save the new coordinates.
         */
        dragListener =
          marker.addEventListener(
            'gmp-dragend',
            () => {
              const position =
                marker.position

              if (!position) {
                return
              }

              const newLatitude =
                typeof position.lat === 'function'
                  ? position.lat()
                  : position.lat

              const newLongitude =
                typeof position.lng === 'function'
                  ? position.lng()
                  : position.lng

              onChangeRef.current({
                address: value || '',
                latitude: newLatitude,
                longitude: newLongitude,
              })
            }
          )

        /*
         * Create address autocomplete.
         */
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

        searchContainerRef.current?.appendChild(
          autocomplete
        )

        autocompleteRef.current =
          autocomplete

        /*
         * When user selects an address.
         */
        autocomplete.addEventListener(
          'gmp-select',
          async (event) => {
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

              const selectedLatitude =
                place.location?.lat?.() ?? null

              const selectedLongitude =
                place.location?.lng?.() ?? null

              if (
                !address ||
                selectedLatitude === null ||
                selectedLongitude === null
              ) {
                setError(
                  'The selected place does not have complete location data.'
                )
                return
              }

              const position = {
                lat: selectedLatitude,
                lng: selectedLongitude,
              }

              map.setCenter(position)
              map.setZoom(17)

              marker.position = position

              setError('')

              onChangeRef.current({
                address,
                latitude: selectedLatitude,
                longitude: selectedLongitude,
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
          'Failed to initialize Google Maps:',
          error
        )

        setError(
          error.message ||
            'Failed to load address picker.'
        )

        setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true

      if (dragListener) {
        dragListener.remove()
      }

      if (autocomplete) {
        autocomplete.remove()
      }

      if (marker) {
        marker.map = null
      }

      autocompleteRef.current = null
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (autocompleteRef.current) {
      autocompleteRef.current.disabled =
        disabled
    }
  }, [disabled])

  return (
    <div>
      <div
        ref={searchContainerRef}
        style={{
          width: '100%',
          marginBottom: '12px',
        }}
      />

      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '300px',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />

      <div className="form-help">
        Search for the address, then drag the pin
        to the exact location if needed.
      </div>

      {loading && (
        <div className="form-help">
          Loading address picker...
        </div>
      )}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {latitude !== null &&
        latitude !== undefined &&
        longitude !== null &&
        longitude !== undefined && (
          <div className="form-help">
            Location: {Number(latitude).toFixed(6)},{' '}
            {Number(longitude).toFixed(6)}
          </div>
        )}
    </div>
  )
}

export default AddressPicker
