export class OTP {
  generateWithExpiry(minutes: number): {
    code: string;
    expiry: Date;
  } {
    return {
      code: this.generateOTP(),
      expiry: this.createExpiryDateInMinutes(minutes),
    };
  }

  private generateOTP(): string {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let otp = '';

    for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  private createExpiryDateInMinutes(minutes: number): Date {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + minutes);

    return expiryDate;
  }
}
