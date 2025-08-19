#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyGamificationSystem() {
  console.log('🔍 Verificando sistema de gamificación...\n')

  try {
    // 1. Verificar tablas existentes
    console.log('📋 1. Verificando tablas de gamificación...')
    
    const tables = [
      'employee_scores',
      'achievement_types', 
      'employee_achievements',
      'point_history'
    ]

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Tabla ${table}: ${error.message}`)
      } else {
        console.log(`✅ Tabla ${table}: OK`)
      }
    }

    // 2. Verificar datos en achievement_types
    console.log('\n🏆 2. Verificando tipos de logros...')
    const { data: achievementTypes, error: atError } = await supabase
      .from('achievement_types')
      .select('*')

    if (atError) {
      console.log(`❌ Error obteniendo achievement_types: ${atError.message}`)
    } else {
      console.log(`✅ Tipos de logros encontrados: ${achievementTypes?.length || 0}`)
      if (achievementTypes && achievementTypes.length > 0) {
        console.log('   Ejemplos:')
        achievementTypes.slice(0, 3).forEach(at => {
          console.log(`   - ${at.name}: ${at.description}`)
        })
      }
    }

    // 3. Verificar datos en employee_scores
    console.log('\n📊 3. Verificando puntajes de empleados...')
    const { data: scores, error: scoresError } = await supabase
      .from('employee_scores')
      .select('*')
      .limit(5)

    if (scoresError) {
      console.log(`❌ Error obteniendo employee_scores: ${scoresError.message}`)
    } else {
      console.log(`✅ Puntajes encontrados: ${scores?.length || 0}`)
      if (scores && scores.length > 0) {
        console.log('   Ejemplos:')
        scores.forEach(score => {
          console.log(`   - Empleado ${score.employee_id}: ${score.total_points} pts totales`)
        })
      }
    }

    // 4. Verificar datos en employee_achievements
    console.log('\n🎖️ 4. Verificando logros de empleados...')
    const { data: achievements, error: achievementsError } = await supabase
      .from('employee_achievements')
      .select('*')
      .limit(5)

    if (achievementsError) {
      console.log(`❌ Error obteniendo employee_achievements: ${achievementsError.message}`)
    } else {
      console.log(`✅ Logros encontrados: ${achievements?.length || 0}`)
      if (achievements && achievements.length > 0) {
        console.log('   Ejemplos:')
        achievements.forEach(achievement => {
          console.log(`   - Empleado ${achievement.employee_id}: ${achievement.points_earned} pts`)
        })
      }
    }

    // 5. Verificar datos en point_history
    console.log('\n📈 5. Verificando historial de puntos...')
    const { data: pointHistory, error: phError } = await supabase
      .from('point_history')
      .select('*')
      .limit(5)

    if (phError) {
      console.log(`❌ Error obteniendo point_history: ${phError.message}`)
    } else {
      console.log(`✅ Historial de puntos encontrado: ${pointHistory?.length || 0}`)
      if (pointHistory && pointHistory.length > 0) {
        console.log('   Ejemplos:')
        pointHistory.forEach(ph => {
          console.log(`   - Empleado ${ph.employee_id}: ${ph.points_earned} pts por ${ph.reason}`)
        })
      }
    }

    // 6. Verificar RLS policies
    console.log('\n🔒 6. Verificando políticas RLS...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policies', { table_name: 'employee_scores' })

    if (policiesError) {
      console.log(`❌ Error obteniendo políticas RLS: ${policiesError.message}`)
    } else {
      console.log(`✅ Políticas RLS encontradas: ${policies?.length || 0}`)
    }

    // 7. Verificar funciones
    console.log('\n⚙️ 7. Verificando funciones de gamificación...')
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_gamification_functions')

    if (functionsError) {
      console.log(`❌ Error obteniendo funciones: ${functionsError.message}`)
    } else {
      console.log(`✅ Funciones encontradas: ${functions?.length || 0}`)
    }

    console.log('\n✅ Verificación del sistema de gamificación completada')

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
  }
}

// Ejecutar verificación
verifyGamificationSystem()
  .then(() => {
    console.log('\n🎯 Verificación completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
