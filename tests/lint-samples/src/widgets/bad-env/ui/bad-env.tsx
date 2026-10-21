// expect: sonic/no-direct-env
export function BadEnv() {
  return <p>{process.env.API_ORIGIN}</p>;
}
