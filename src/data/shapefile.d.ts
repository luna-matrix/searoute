declare module 'shapefile' {
  export function open(
    shp: string,
    dbf?: string,
  ): Promise<{
    read(): Promise<{
      done: boolean
      value: {
        geometry: { type: string; coordinates: unknown }
        properties: Record<string, unknown>
      }
    }>
  }>
}
