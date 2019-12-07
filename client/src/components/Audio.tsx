import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from 'video.js'

// @ts-ignore
window.AudioContext = window.AudioContext || window.webkitAudioContext

/* CONST */
const SMOOTHING = 0.5
const FFT_SIZE = 2048

// 引数で定めた範囲の数をランダムに返す。
const rand = (min: number, max: number) => Math.random() * (max - min) + min

class Loader {
  url: string
  onLoad: (buffer: any) => void
  audioCtx: AudioContext

  constructor(
    url: string,
    callback: (buffer: any) => void,
    audioCtx: AudioContext
  ) {
    this.url = url
    this.onLoad = callback
    this.audioCtx = audioCtx
  }

  loadBuffer(audioNode: HTMLMediaElement) {
    const audioSourceNode = this.audioCtx.createMediaElementSource(audioNode)
    this.onLoad(audioSourceNode)
  }
}

/**
 * ビジュアライザー
 */
class Visualizer {
  audioCtx: AudioContext
  ctx: CanvasRenderingContext2D
  numBars: number
  analyser: AnalyserNode
  freqs: Uint8Array
  times: Uint8Array
  // source: AudioBufferSourceNode
  mediaElementAudioSource: MediaElementAudioSourceNode

  constructor(
    node: MediaElementAudioSourceNode,
    audioCtx: AudioContext,
    ctx: CanvasRenderingContext2D
  ) {
    this.audioCtx = audioCtx
    this.ctx = ctx
    this.numBars = 128
    this.analyser = audioCtx.createAnalyser()
    this.analyser.connect(audioCtx.destination)
    this.analyser.minDecibels = -140
    this.analyser.maxDecibels = 0
    this.freqs = new Uint8Array(this.analyser.frequencyBinCount)
    this.times = new Uint8Array(this.analyser.frequencyBinCount)
    this.mediaElementAudioSource = node
    this.mediaElementAudioSource.connect(this.analyser)
  }

  draw() {
    this.analyser.smoothingTimeConstant = SMOOTHING
    this.analyser.fftSize = FFT_SIZE
    this.analyser.getByteFrequencyData(this.freqs)
    this.ctx.globalCompositeOperation = 'destination-out'
    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
    this.ctx.globalCompositeOperation = 'source-over'

    for (let index = 0; index < this.numBars; index += 1) {
      this.drawTop(index)
    }

    for (let index = 0; index < this.analyser.frequencyBinCount; index += 1) {
      this.drawBottom(index)
    }

    window.requestAnimationFrame(this.draw.bind(this))
  }

  dispose() {
    this.mediaElementAudioSource.disconnect()
    this.analyser.disconnect()
  }

  drawTop(index: number) {
    const barWidth = window.innerWidth / 128 / 2
    const spacerWidth = barWidth * 2
    const height = this.freqs[index] - 160
    const hue = (index / 128) * 360

    this.ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)'

    if (height > 40) {
      this.ctx.fillRect(
        index * spacerWidth,
        window.innerHeight,
        barWidth,
        -height * 5
      )
    }
    if (height > 35) {
      this.ctx.fillRect(
        index * spacerWidth,
        window.innerHeight,
        barWidth,
        -height * 4
      )
    }
    if (height > 0) {
      this.ctx.fillRect(
        index * spacerWidth,
        window.innerHeight,
        barWidth,
        -height * 3
      )
    }
    if (height < 0) {
      this.ctx.fillRect(
        index * spacerWidth,
        window.innerHeight,
        barWidth,
        -rand(1, 5)
      )
    }
  }

  drawBottom(index: number) {
    const barWidth = window.innerWidth / this.analyser.frequencyBinCount
    const height = this.freqs[index]
    const hue = (index / this.analyser.frequencyBinCount) * 360

    this.ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)'
    this.ctx.fillRect(
      index * barWidth,
      window.innerHeight / 2,
      barWidth,
      -height
    )
  }
}

const Wrapper = styled.div`
  background: black;
`

const Button = styled.button`
  cursor: pointer;
  position: absolute;
  top: 10px;
  left: 10px;
  width: 200px;
  padding: 20px;
  text-align: center;
  border: 1px solid #fff;
  border-radius: 4px;
`

export const Audio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [visualizer, setVisualizer] = useState<Visualizer>()
  const [audioCtx, setAudioCtx] = useState<AudioContext>()
  const [player, setPlayer] = useState<VideoJsPlayer>()

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth
      canvasRef.current.height = window.innerHeight
      setCtx(canvasRef.current.getContext('2d'))
    }
  }, [])

  useEffect(() => {
    setAudioCtx(new AudioContext())
  }, [])

  const initVisualizer = useCallback(
    (node: MediaElementAudioSourceNode) => {
      if (!audioCtx || !ctx || !audioRef.current) return
      setVisualizer(new Visualizer(node, audioCtx, ctx))
    },
    [audioCtx, ctx]
  )

  useEffect(() => {
    if (!audioCtx || !audioRef.current) return
    const loader = new Loader(
      'http://localhost:8080/sample.mp3',
      initVisualizer,
      audioCtx
    )
    loader.loadBuffer(audioRef.current)
  }, [audioCtx, initVisualizer])

  const handleClick = useCallback(() => {
    console.log(player)
    player && player.play()
    visualizer && visualizer.draw()
  }, [visualizer, player])

  useEffect(() => {
    if (!audioRef) return
    const options: VideoJsPlayerOptions = {
      autoplay: false,
      preload: 'none',
    }
    setPlayer(videojs(audioRef.current, options))
  }, [audioRef])

  useEffect(() => {
    return () => {
      visualizer && visualizer.dispose()
    }
  }, [visualizer])

  useEffect(() => {
    return () => {
      player && player.dispose()
    }
  }, [player])


  return (
    <Wrapper>
      <Button onClick={handleClick}>クリックして再生</Button>
      <canvas ref={canvasRef} />
      <audio
        style={{ display: 'none' }}
        crossOrigin="anonymous"
        ref={audioRef}
        controls
      >
        <source
          src="http://localhost:8080/index.m3u8"
          type="application/x-mpegURL"
        />
      </audio>
    </Wrapper>
  )
}
