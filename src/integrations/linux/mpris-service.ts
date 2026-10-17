export class MprisService {
  public async isSupported(): Promise<boolean> {
    return false;
  }

  public async connect(): Promise<void> {
    // Intentionally deferred. Linux Mint MPRIS integration will be implemented later.
  }
}
