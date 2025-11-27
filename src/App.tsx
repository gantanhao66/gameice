import React, { useState, useEffect, useRef } from 'react'
import './App.css'

interface Plant {
  id: string
  type: 'sunflower' | 'peashooter'
  x: number
  y: number
}

interface Zombie {
  id: string
  x: number
  y: number
  health: number
}

interface Pea {
  id: string
  x: number
  y: number
  zombieY: number
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [zombies, setZombies] = useState<Zombie[]>([])
  const [peas, setPeas] = useState<Pea[]>([])
  const [sun, setSun] = useState(100)
  const [selectedPlant, setSelectedPlant] = useState<'sunflower' | 'peashooter' | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const zombieSpawnRef = useRef<NodeJS.Timeout | null>(null)

  const GRID_WIDTH = 80
  const GRID_HEIGHT = 100
  const COLS = 9
  const ROWS = 5

  // 处理网格点击
  const handleGridClick = (col: number, row: number) => {
    if (!selectedPlant || gameOver) return

    const existingPlant = plants.find(p => 
      Math.floor(p.x / GRID_WIDTH) === col && Math.floor(p.y / GRID_HEIGHT) === row
    )

    if (existingPlant) return

    const cost = selectedPlant === 'sunflower' ? 50 : 100
    if (sun < cost) return

    const newPlant: Plant = {
      id: `plant-${Date.now()}`,
      type: selectedPlant,
      x: col * GRID_WIDTH,
      y: row * GRID_HEIGHT
    }

    setPlants([...plants, newPlant])
    setSun(sun - cost)
  }

  // 游戏循环
  useEffect(() => {
    gameLoopRef.current = setInterval(() => {
      setZombies(prevZombies => {
        let updatedZombies = prevZombies.map(z => ({
          ...z,
          x: z.x - 1
        })).filter(z => z.x > -50)

        // 检查僵尸是否到达左边界
        if (updatedZombies.some(z => z.x < 0)) {
          setGameOver(true)
        }

        return updatedZombies
      })

      // 豌豆移动和碰撞检测
      setPeas(prevPeas => {
        let updatedPeas = prevPeas.map(p => ({
          ...p,
          x: p.x + 5
        })).filter(p => p.x < 800)

        // 碰撞检测
        setZombies(prevZombies => {
          let updatedZombies = [...prevZombies]
          
          updatedPeas = updatedPeas.filter(pea => {
            let hit = false
            updatedZombies = updatedZombies.map(zombie => {
              if (
                Math.abs(pea.x - zombie.x) < 30 &&
                Math.abs(pea.y - zombie.y) < 30
              ) {
                hit = true
                return { ...zombie, health: zombie.health - 20 }
              }
              return zombie
            })
            return !hit
          })

          updatedZombies = updatedZombies.filter(z => z.health > 0)
          setScore(prev => prev + (prevZombies.length - updatedZombies.length) * 10)
          
          return updatedZombies
        })

        return updatedPeas
      })

      // 植物射击
      setPlants(prevPlants => {
        const newPeas: Pea[] = []
        
        prevPlants.forEach(plant => {
          if (plant.type === 'peashooter') {
            zombies.forEach(zombie => {
              if (Math.abs(plant.y - zombie.y) < 50 && zombie.x > plant.x) {
                newPeas.push({
                  id: `pea-${Date.now()}-${Math.random()}`,
                  x: plant.x + GRID_WIDTH,
                  y: plant.y + GRID_HEIGHT / 2,
                  zombieY: zombie.y
                })
              }
            })
          }
        })

        if (newPeas.length > 0) {
          setPeas(prev => [...prev, ...newPeas])
        }

        return prevPlants
      })

      // 向日葵产生阳光
      setPlants(prevPlants => {
        let sunGain = 0
        prevPlants.forEach(plant => {
          if (plant.type === 'sunflower' && Math.random() < 0.02) {
            sunGain += 25
          }
        })
        if (sunGain > 0) {
          setSun(prev => prev + sunGain)
        }
        return prevPlants
      })
    }, 50)

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [zombies])

  // 僵尸生成
  useEffect(() => {
    zombieSpawnRef.current = setInterval(() => {
      if (!gameOver && zombies.length < 10) {
        const newZombie: Zombie = {
          id: `zombie-${Date.now()}`,
          x: 800,
          y: Math.floor(Math.random() * ROWS) * GRID_HEIGHT + GRID_HEIGHT / 2,
          health: 100
        }
        setZombies(prev => [...prev, newZombie])
      }
    }, 2000)

    return () => {
      if (zombieSpawnRef.current) clearInterval(zombieSpawnRef.current)
    }
  }, [gameOver, zombies.length])

  // 绘制游戏
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.fillStyle = '#87CEEB'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制网格
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath()
      ctx.moveTo(i * GRID_WIDTH, 0)
      ctx.lineTo(i * GRID_WIDTH, ROWS * GRID_HEIGHT)
      ctx.stroke()
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * GRID_HEIGHT)
      ctx.lineTo(COLS * GRID_WIDTH, i * GRID_HEIGHT)
      ctx.stroke()
    }

    // 绘制植物
    plants.forEach(plant => {
      if (plant.type === 'sunflower') {
        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.arc(plant.x + GRID_WIDTH / 2, plant.y + GRID_HEIGHT / 2, 20, 0, Math.PI * 2)
        ctx.fill()
      } else if (plant.type === 'peashooter') {
        ctx.fillStyle = '#00AA00'
        ctx.fillRect(plant.x + 15, plant.y + 15, 50, 70)
      }
    })

    // 绘制僵尸
    zombies.forEach(zombie => {
      ctx.fillStyle = '#888888'
      ctx.fillRect(zombie.x - 15, zombie.y - 25, 30, 50)
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(zombie.x - 5, zombie.y - 15, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(zombie.x + 5, zombie.y - 15, 5, 0, Math.PI * 2)
      ctx.fill()
    })

    // 绘制豌豆
    peas.forEach(pea => {
      ctx.fillStyle = '#90EE90'
      ctx.beginPath()
      ctx.arc(pea.x, pea.y, 5, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [plants, zombies, peas])

  return (
    <div className="game-container">
      <div className="header">
        <h1>🌱 植物大战僵尸 🧟</h1>
        <div className="stats">
          <div className="stat">☀️ 阳光: {sun}</div>
          <div className="stat">📊 分数: {score}</div>
        </div>
      </div>

      <div className="game-board">
        <canvas
          ref={canvasRef}
          width={COLS * GRID_WIDTH}
          height={ROWS * GRID_HEIGHT}
          onClick={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (rect) {
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              const col = Math.floor(x / GRID_WIDTH)
              const row = Math.floor(y / GRID_HEIGHT)
              handleGridClick(col, row)
            }
          }}
        />
      </div>

      <div className="controls">
        <button
          className={`plant-btn ${selectedPlant === 'sunflower' ? 'active' : ''}`}
          onClick={() => setSelectedPlant('sunflower')}
        >
          🌻 向日葵 (50☀️)
        </button>
        <button
          className={`plant-btn ${selectedPlant === 'peashooter' ? 'active' : ''}`}
          onClick={() => setSelectedPlant('peashooter')}
        >
          🌿 豌豆射手 (100☀️)
        </button>
        <button
          className="reset-btn"
          onClick={() => {
            setPlants([])
            setZombies([])
            setPeas([])
            setSun(100)
            setScore(0)
            setGameOver(false)
            setSelectedPlant(null)
          }}
        >
          🔄 重新开始
        </button>
      </div>

      {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <h2>游戏结束！</h2>
            <p>最终分数: {score}</p>
            <button onClick={() => {
              setPlants([])
              setZombies([])
              setPeas([])
              setSun(100)
              setScore(0)
              setGameOver(false)
              setSelectedPlant(null)
            }}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
