import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../lib/googleMaps'

function buildShortAddress(components, fallback) {
  if (!components?.length) {
    return fallback
  }

  const get = (type) =>
    components.find((component) =>
      component.types?.includes(type)
    )?.longText || ''

  const street = get('route')
  const number = get('street_number')
  const neighborhood =
    get('neighborhood') ||
    get('sublocality_level_1')
  const city =
    get('locality') ||
    get('administrative_area_level_2')

  const streetPart = [street, number]
    .filter(Boolean)
    .join(' ')

  return [
    streetPart,
    neighborhood,
    city,
  ]
    .filter(Boolean)
    .join(', ') || fallback
}

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
  const [shortAddress, setShortAddress] =
    useState('')

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

        const hasCoordinates =
          latitude !== null &&
          latitude !== undefined &&
          longitude !== null &&
          longitude !== undefined

        const initialPosition = hasCoordinates
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
            zoom: hasCoordinates ? 17 : 11,
            mapId: 'DEMO_MAP_ID',
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }
        )

        mapRef.current = map

        marker = new AdvancedMarkerElement({
          map,
          position: hasCoordinates
            ? initialPosition
            : null,
          gmpDraggable: true,
          title: 'Drag to adjust location',
        })

        markerRef.current = marker

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
                  'addressComponents',
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

              const compactAddress =
                buildShortAddress(
                  place.addressComponents,
                  address
                )

              const position = {
                lat: selectedLatitude,
                lng: selectedLongitude,
              }

              map.setCenter(position)
              map.setZoom(17)

              marker.position = position

              setShortAddress(
                compactAddress
              )

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

      {shortAddress && (
        <div
          style={{
            marginBottom: '12px',
            fontWeight: 500,
          }}
        >
          {shortAddress}
        </div>
      )}

      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '220px',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />

      <div className="form-help">
        Drag the pin to adjust the location.
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
    </div>
  )
}

export default AddressPicker
