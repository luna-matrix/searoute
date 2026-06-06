import type { FeatureCollection, LineString } from 'geojson'
import data from './shipping-lanes.json'

export type ShippingLaneType = 'canal' | 'strait' | 'passage' | 'cape' | 'ocean_route' | 'approach'

export type ShippingLaneImportance = 'primary' | 'alternative' | 'restricted'

export interface ShippingLaneProperties {
  name: string
  type: ShippingLaneType
  importance: ShippingLaneImportance
}

export const SHIPPING_LANES = data as unknown as FeatureCollection<
  LineString,
  ShippingLaneProperties
>
