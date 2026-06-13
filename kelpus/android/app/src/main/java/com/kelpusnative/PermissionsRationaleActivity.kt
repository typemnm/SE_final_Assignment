package com.kelpusnative

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val rationale = TextView(this).apply {
      text = "Kelpus는 사용자가 요청한 동기화 시점에만 Health Connect의 식단, 러닝, 걸음 수, 칼로리, 심박 데이터를 읽어 건강 기록을 통합합니다. 수면, 백그라운드, 과거 전체 데이터 권한은 요청하지 않습니다."
      textSize = 16f
      gravity = Gravity.CENTER
      setPadding(48, 48, 48, 48)
    }

    setContentView(rationale)
  }
}
