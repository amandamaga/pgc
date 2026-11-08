/**
 * registration.error.ts
 * Erro do cadastro de pesquisadora, já com o status HTTP que a rota deve devolver.
 *
 * Fica num arquivo próprio para que os testes da rota possam mockar
 * auth.service.ts inteiro e ainda usar a classe real.
 */

export type RegistrationErrorStatus = 400 | 403 | 409;

export class RegistrationError extends Error {
  constructor(public readonly status: RegistrationErrorStatus, message: string) {
    super(message);
    this.name = 'RegistrationError';
  }
}
