import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from 'video.js'

// @ts-ignore
window.AudioContext = window.AudioContext || window.webkitAudioContext

const SMOOTHING = 0.5
const FFT_SIZE = 2048
const NUM_BARS = 128

class Visualizer {
  width: number
  height: number
  audioCtx: AudioContext
  ctx: CanvasRenderingContext2D
  analyser: AnalyserNode
  frequencies: Uint8Array
  times: Uint8Array
  sourceNode: MediaElementAudioSourceNode

  constructor(
    width: number,
    height: number,
    sourceNode: MediaElementAudioSourceNode,
    audioCtx: AudioContext,
    ctx: CanvasRenderingContext2D
  ) {
    this.width = width
    this.height = height
    this.audioCtx = audioCtx
    this.ctx = ctx
    this.analyser = audioCtx.createAnalyser()
    this.analyser.connect(audioCtx.destination)
    this.analyser.minDecibels = -140
    this.analyser.maxDecibels = 0
    this.frequencies = new Uint8Array(this.analyser.frequencyBinCount)
    this.times = new Uint8Array(this.analyser.frequencyBinCount)
    this.sourceNode = sourceNode
    this.sourceNode.connect(this.analyser)
  }

  draw() {
    this.analyser.smoothingTimeConstant = SMOOTHING
    this.analyser.fftSize = FFT_SIZE
    this.analyser.getByteFrequencyData(this.frequencies)
    this.ctx.globalCompositeOperation = 'destination-out'
    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.globalCompositeOperation = 'source-over'

    for (let index = 0; index < NUM_BARS; index += 1) {
      this.drawTop(index)
    }

    for (let index = 0; index < this.analyser.frequencyBinCount; index += 1) {
      this.drawBottom(index)
    }

    window.requestAnimationFrame(this.draw.bind(this))
  }

  drawTop(index: number) {
    const barWidth = this.height / NUM_BARS / 2
    const spacerWidth = barWidth * 2
    const height = this.frequencies[index] - 160
    const hue = (index / 128) * 360

    this.ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)'

    if (height > 40) {
      this.ctx.fillRect(index * spacerWidth, this.height, barWidth, -height * 5)
    }
    if (height > 35) {
      this.ctx.fillRect(index * spacerWidth, this.height, barWidth, -height * 4)
    }
    if (height > 0) {
      this.ctx.fillRect(index * spacerWidth, this.height, barWidth, -height * 3)
    }
    if (height < 0) {
      this.ctx.fillRect(index * spacerWidth, this.height, barWidth, -1)
    }
  }

  drawBottom(index: number) {
    const barWidth = this.height / this.analyser.frequencyBinCount
    const height = this.frequencies[index]
    const hue = (index / this.analyser.frequencyBinCount) * 360

    this.ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)'
    this.ctx.fillRect(index * barWidth, this.height / 2, barWidth, -height)
  }
}

const Wrapper = styled.div`
  background: #000;
`

const Button = styled.button`
  cursor: pointer;
  position: absolute;
  top: 10px;
  left: 10px;
  width: 200px;
  padding: 20px;
  text-align: center;
`

export const Audio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [visualizer, setVisualizer] = useState<Visualizer>()
  const [audioCtx, setAudioCtx] = useState<AudioContext>()
  const [player, setPlayer] = useState<VideoJsPlayer>()

  useEffect(() => {
    setAudioCtx(new AudioContext())

    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth
      canvasRef.current.height = window.innerHeight
      setCtx(canvasRef.current.getContext('2d'))
    }

    const options: VideoJsPlayerOptions = {
      autoplay: false,
      preload: 'none',
    }
    setPlayer(videojs(audioRef.current, options))
  }, [])

  useEffect(() => {
    if (!audioCtx || !audioRef.current || !ctx) return
    const audioSourceNode = audioCtx.createMediaElementSource(audioRef.current)
    setVisualizer(
      new Visualizer(
        window.innerWidth,
        window.innerHeight,
        audioSourceNode,
        audioCtx,
        ctx
      )
    )
  }, [audioCtx, ctx])

  const handleClick = useCallback(() => {
    player && player.play()
    visualizer && visualizer.draw()
  }, [visualizer, player])

  return (
    <Wrapper>
      <Button onClick={handleClick}>クリックして再生</Button>
      <canvas ref={canvasRef} />
      <audio style={{ display: 'none' }} ref={audioRef} controls>
        <source
          src="http://localhost:8080/index.m3u8"
          type="application/x-mpegURL"
        />
      </audio>
    </Wrapper>
  )
}
