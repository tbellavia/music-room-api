import { Request, Response } from 'express';
import { InvalidJsonBody } from 'src/interface/http/errors/invalid-json-body.error';
import { RequestBodyTooLarge } from 'src/interface/http/errors/request-body-too-large.error';
import { translateRequestBodyError } from './request-body-error.middleware';

// body-parser raises errors carrying a `type`
function bodyParserError(type: string): Error {
  return Object.assign(new Error('body-parser error'), { type });
}

describe('translateRequestBodyError', () => {
  let next: jest.Mock<void, [unknown]>;
  const request = {} as Request;
  const response = {} as Response;

  // Returns the error passed on to the exception filter
  function translate(error: unknown): unknown {
    translateRequestBodyError(error, request, response, next);
    return next.mock.calls[0][0];
  }

  beforeEach(() => {
    next = jest.fn<void, [unknown]>();
  });

  it('turns an invalid JSON body into InvalidJsonBody', () => {
    const translated = translate(bodyParserError('entity.parse.failed'));

    expect(translated).toBeInstanceOf(InvalidJsonBody);
  });

  it('turns a too large body into RequestBodyTooLarge', () => {
    const translated = translate(bodyParserError('entity.too.large'));

    expect(translated).toBeInstanceOf(RequestBodyTooLarge);
  });

  it('passes any other error on unchanged', () => {
    const otherError = new Error('something else');

    const translated = translate(otherError);

    expect(translated).toBe(otherError);
  });
});
