package com.viarank.app;

import android.os.Bundle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.DistanceRecord;
import androidx.health.connect.client.records.ExerciseSessionRecord;
import java.util.Set;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private ActivityResultLauncher<Set<String>> healthPermissionLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(ActivityTrackingPlugin.class);
        healthPermissionLauncher = registerForActivityResult(
            androidx.health.connect.client.PermissionController.createRequestPermissionResultContract(),
            grantedPermissions -> {
            }
        );

        super.onCreate(savedInstanceState);
    }

    public void requestHealthConnectPermissions() {
        Set<String> permissions = Set.of(
            HealthPermission.getReadPermission(kotlin.jvm.JvmClassMappingKt.getKotlinClass(ExerciseSessionRecord.class)),
            HealthPermission.getReadPermission(kotlin.jvm.JvmClassMappingKt.getKotlinClass(DistanceRecord.class))
        );

        healthPermissionLauncher.launch(permissions);
    }
}
