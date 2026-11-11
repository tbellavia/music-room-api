import { Matches } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import { PositionDto } from './position.dto';

// YouTube video ids are 11 characters long
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export class AddTrackDto extends PositionDto {
  @Matches(VIDEO_ID_PATTERN, {
    ...withCode('VIDEO_ID_INVALID'),
    message: 'videoId must be a YouTube video id',
  })
  videoId: string;
}
