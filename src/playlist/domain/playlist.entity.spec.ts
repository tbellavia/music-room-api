import { Music } from "../../music/domain/music.entity";
import { Playlist } from "./playlist.entity";

describe("Playlist", () => {
  it("Should create empty playlist", () => {
    const playlist = Playlist.create({
      id: "",
      owner_id: ""
    });

    expect(playlist.tracks).toEqual([]);
  })

  it("Should push multiple musics", () => {
    const playlist = Playlist.create({
      id: "",
      owner_id: ""
    });

    const userId = "";
    const music_one = Music.create({ videoId: "A", name: "A", artist: "A", thumbnail: null, duration: 0 });
    playlist.push(userId, music_one);
    const music_two = Music.create({ videoId: "B", name: "B", artist: "B", thumbnail: null, duration: 0 });
    playlist.push(userId, music_two);
    const music_three = Music.create({ videoId: "C", name: "C", artist: "C", thumbnail: null, duration: 0 });
    playlist.push(userId, music_three);

    expect(playlist.tracks).toHaveLength(3);
    expect(playlist.tracks[playlist.tracks.length - 1].music).toEqual(music_three);
  })
})

describe("Playlist Integration Test", () => {
  it("Should behave good", () => {
    const playlist = Playlist.create({
      id: "11111111",
      owner_id: "22222222",
      name: "Playlist to party on",
      participants: [
        "22222222",
        "33333333",
        "44444444"
      ],
    });


  })

  it("Should throw error if max music number is achived", () => {

  })
})
