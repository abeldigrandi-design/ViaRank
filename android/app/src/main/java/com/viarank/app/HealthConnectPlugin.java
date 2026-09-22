package com.viarank.app;

import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.DistanceRecord;
import androidx.health.connect.client.units.Length;
import androidx.health.connect.client.records.ExerciseSessionRecord;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;

import java.util.Set;
import java.util.Collections;
import java.time.Instant;

import kotlin.ResultKt;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import kotlin.jvm.JvmClassMappingKt;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    @PluginMethod
    public void requestHealthPermissions(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.requestHealthConnectPermissions();

        JSObject response = new JSObject();
        response.put("requested", true);
        call.resolve(response);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        try {
            HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());
            PermissionController controller = client.getPermissionController();

            String exercisePermission = HealthPermission.getReadPermission(
                JvmClassMappingKt.getKotlinClass(ExerciseSessionRecord.class)
            );

            String distancePermission = HealthPermission.getReadPermission(
                JvmClassMappingKt.getKotlinClass(DistanceRecord.class)
            );

            Continuation<Set<String>> continuation = new Continuation<Set<String>>() {
                @Override
                public CoroutineContext getContext() {
                    return EmptyCoroutineContext.INSTANCE;
                }

                @Override
                public void resumeWith(Object result) {
                    try {
                        ResultKt.throwOnFailure(result);

                        @SuppressWarnings("unchecked")
                        Set<String> granted = (Set<String>) result;

                        JSObject response = new JSObject();
                        response.put("exercise", granted.contains(exercisePermission));
                        response.put("distance", granted.contains(distancePermission));
                        response.put(
                            "allGranted",
                            granted.contains(exercisePermission) &&
                            granted.contains(distancePermission)
                        );

                        call.resolve(response);
                    } catch (Exception error) {
                        call.reject("Error comprobando permisos de Health Connect", error);
                    }
                }
            };

            Object immediateResult = controller.getGrantedPermissions(continuation);
            if (immediateResult != IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                continuation.resumeWith(immediateResult);
            }

        } catch (Exception error) {
            call.reject("Error iniciando Health Connect", error);
        }
    }


    @PluginMethod
    public void readActivities(PluginCall call) {
        try {
            HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());

            Instant endTime = Instant.now();
            Instant startTime = endTime.minusSeconds(30L * 24L * 60L * 60L);

            ReadRecordsRequest<ExerciseSessionRecord> request =
                new ReadRecordsRequest<>(
                    JvmClassMappingKt.getKotlinClass(ExerciseSessionRecord.class),
                    TimeRangeFilter.between(startTime, endTime),
                    Collections.emptySet(),
                    false,
                    1000,
                    null
                );

            Continuation<ReadRecordsResponse<ExerciseSessionRecord>> continuation =
                new Continuation<ReadRecordsResponse<ExerciseSessionRecord>>() {
                    @Override
                    public CoroutineContext getContext() {
                        return EmptyCoroutineContext.INSTANCE;
                    }

                    @Override
                    public void resumeWith(Object result) {
                        try {
                            ResultKt.throwOnFailure(result);

                            @SuppressWarnings("unchecked")
                            ReadRecordsResponse<ExerciseSessionRecord> response =
                                (ReadRecordsResponse<ExerciseSessionRecord>) result;

                            JSArray activities = new JSArray();

                            for (ExerciseSessionRecord record : response.getRecords()) {
                                JSObject activity = new JSObject();
                                activity.put("id", record.getMetadata().getId());
                                activity.put("exerciseType", record.getExerciseType());
                                activity.put("startTime", record.getStartTime().toString());
                                activity.put("endTime", record.getEndTime().toString());
                                activity.put(
                                    "source",
                                    record.getMetadata().getDataOrigin().getPackageName()
                                );

                                if (record.getTitle() != null) {
                                    activity.put("title", record.getTitle());
                                }

                                activities.put(activity);
                            }

                            JSObject output = new JSObject();
                            output.put("count", response.getRecords().size());
                            output.put("activities", activities);

                            call.resolve(output);

                        } catch (Exception error) {
                            call.reject("Error leyendo actividades de Health Connect", error);
                        }
                    }
                };

            Object immediateResult = client.readRecords(request, continuation);

            if (immediateResult != IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                continuation.resumeWith(immediateResult);
            }

        } catch (Exception error) {
            call.reject("Error iniciando lectura de Health Connect", error);
        }
    }

    @PluginMethod
    public void readDistances(PluginCall call) {
        try {
            HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());

            Instant endTime = Instant.now();
            Instant startTime = endTime.minusSeconds(30L * 24L * 60L * 60L);

            ReadRecordsRequest<DistanceRecord> request =
                new ReadRecordsRequest<>(
                    JvmClassMappingKt.getKotlinClass(DistanceRecord.class),
                    TimeRangeFilter.between(startTime, endTime),
                    Collections.emptySet(),
                    false,
                    1000,
                    null
                );

            Continuation<ReadRecordsResponse<DistanceRecord>> continuation =
                new Continuation<ReadRecordsResponse<DistanceRecord>>() {
                    @Override
                    public CoroutineContext getContext() {
                        return EmptyCoroutineContext.INSTANCE;
                    }

                    @Override
                    public void resumeWith(Object result) {
                        try {
                            ResultKt.throwOnFailure(result);

                            @SuppressWarnings("unchecked")
                            ReadRecordsResponse<DistanceRecord> response =
                                (ReadRecordsResponse<DistanceRecord>) result;

                            JSArray distances = new JSArray();
                            double totalKilometers = 0.0;

                            for (DistanceRecord record : response.getRecords()) {
                                double kilometers = record.getDistance().getKilometers();
                                totalKilometers += kilometers;

                                JSObject item = new JSObject();
                                item.put("id", record.getMetadata().getId());
                                item.put("kilometers", kilometers);
                                item.put("startTime", record.getStartTime().toString());
                                item.put("endTime", record.getEndTime().toString());
                                item.put(
                                    "source",
                                    record.getMetadata().getDataOrigin().getPackageName()
                                );

                                distances.put(item);
                            }

                            JSObject output = new JSObject();
                            output.put("count", response.getRecords().size());
                            output.put("totalKilometers", totalKilometers);
                            output.put("distances", distances);

                            call.resolve(output);

                        } catch (Exception error) {
                            call.reject("Error leyendo distancias de Health Connect", error);
                        }
                    }
                };

            Object immediateResult = client.readRecords(request, continuation);

            if (immediateResult != IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                continuation.resumeWith(immediateResult);
            }

        } catch (Exception error) {
            call.reject("Error iniciando lectura de distancias de Health Connect", error);
        }
    }
    @PluginMethod
    public void ping(PluginCall call) {
        JSObject result = new JSObject();
        result.put("message", "Health Connect disponible");
        call.resolve(result);
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        int status = HealthConnectClient.getSdkStatus(getContext());

        JSObject result = new JSObject();
        result.put("available", status == HealthConnectClient.SDK_AVAILABLE);
        result.put("status", status);

        call.resolve(result);
    }
}
