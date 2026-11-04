package com.music.app.features.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material.icons.filled.Radio
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.music.app.core.designsystem.theme.AudexFontFamily
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze

@Composable
fun SettingScreen(
    isNationalNet: Boolean,
    onToggleNationalNet: (Boolean) -> Unit,
    isDarkTheme: Boolean,
    onToggleTheme: (Boolean) -> Unit,
    hazeState: HazeState,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .haze(state = hazeState),
        contentPadding = PaddingValues(top = 130.dp, bottom = 160.dp, start = 16.dp, end = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Settings",
                        fontFamily = AudexFontFamily,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFEDEDED)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Preferences and streaming",
                        fontSize = 12.sp,
                        color = Color(0xFFA1A1A6)
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color(0xFF00E5FF).copy(alpha = 0.15f))
                        .border(1.dp, Color(0xFF00E5FF).copy(alpha = 0.3f), CircleShape)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "v2.4",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF00E5FF)
                    )
                }
            }
        }

        // ── CARD 1: IR Net Shield ──
        item {
            val cardShape = RoundedCornerShape(20.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(Color(0xFF12141C))
                    .border(1.dp, Color.White.copy(alpha = 0.06f), cardShape)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isNationalNet) Color(0xFF064E3B).copy(alpha = 0.5f) else Color.White.copy(alpha = 0.05f)
                            )
                            .border(
                                1.dp,
                                if (isNationalNet) Color(0xFF10B981).copy(alpha = 0.4f) else Color.White.copy(alpha = 0.1f),
                                RoundedCornerShape(12.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Security,
                            contentDescription = "Shield",
                            tint = if (isNationalNet) Color(0xFF34D399) else Color(0xFFA1A1A6),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = "IR Net Shield",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFEDEDED)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Stream via domestic servers without VPN",
                            fontSize = 11.sp,
                            color = Color(0xFF71717A)
                        )
                    }
                }

                Switch(
                    checked = isNationalNet,
                    onCheckedChange = onToggleNationalNet,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF10B981),
                        uncheckedThumbColor = Color(0xFFA1A1A6),
                        uncheckedTrackColor = Color.White.copy(alpha = 0.15f)
                    )
                )
            }
        }

        // ── CARD 2: Language ──
        item {
            val cardShape = RoundedCornerShape(20.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(Color(0xFF12141C))
                    .border(1.dp, Color.White.copy(alpha = 0.06f), cardShape)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.05f))
                            .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Language,
                            contentDescription = "Language",
                            tint = Color(0xFF22D3EE),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = "Language",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFEDEDED)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Default interface language",
                            fontSize = 11.sp,
                            color = Color(0xFF71717A)
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.08f))
                        .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "English",
                        fontSize = 12.sp,
                        color = Color(0xFFEDEDED)
                    )
                }
            }
        }

        // ── CARD 3: Theme Toggle ──
        item {
            val cardShape = RoundedCornerShape(20.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(Color(0xFF12141C))
                    .border(1.dp, Color.White.copy(alpha = 0.06f), cardShape)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.05f))
                            .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isDarkTheme) Icons.Default.Nightlight else Icons.Default.WbSunny,
                            contentDescription = "Theme",
                            tint = Color(0xFFFBBF24),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = "Theme",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFEDEDED)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = if (isDarkTheme) "Dark mode (OLED)" else "Light mode (Clean frost)",
                            fontSize = 11.sp,
                            color = Color(0xFF71717A)
                        )
                    }
                }

                Switch(
                    checked = !isDarkTheme,
                    onCheckedChange = { onToggleTheme(!it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFFF59E0B),
                        uncheckedThumbColor = Color(0xFFA1A1A6),
                        uncheckedTrackColor = Color.White.copy(alpha = 0.15f)
                    )
                )
            }
        }

        // ── App Info Card ──
        item {
            val infoShape = RoundedCornerShape(20.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(infoShape)
                    .background(Color.White.copy(alpha = 0.02f))
                    .border(1.dp, Color.White.copy(alpha = 0.04f), infoShape)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Radio,
                        contentDescription = null,
                        tint = Color(0xFF22D3EE),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Sepotify x LastWave Native",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFEDEDED)
                    )
                }
                Text(
                    text = "High-fidelity audio streaming client with native Liquid Glass materials, real-time hardware blur, and verified YouTube Music streaming.",
                    fontSize = 11.sp,
                    color = Color(0xFF71717A),
                    lineHeight = 16.sp
                )
            }
        }
    }
}
