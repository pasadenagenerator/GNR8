/** A gateway timeout may be plain text; never show its JSON parser error to users. */
export async function readStackiResponse(response: Response) {
  try { return await response.json(); }
  catch {
    throw new Error(response.status === 504
      ? 'Priprava urejevalnika je presegla časovno omejitev. Zagon ni potrjen; ne odpirajte nove seje, dokler ne preverimo obstoječe.'
      : 'Strežnik ni vrnil veljavnega odgovora. Uspeh dejanja ni potrjen; pred ponovitvijo preverite stanje.');
  }
}
