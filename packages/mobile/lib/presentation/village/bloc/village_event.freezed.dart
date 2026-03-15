// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'village_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$VillageEvent {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(Map<String, dynamic> data) resourcesUpdated,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(Map<String, dynamic> data)? resourcesUpdated,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(Map<String, dynamic> data)? resourcesUpdated,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_ResourcesUpdated value) resourcesUpdated,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_ResourcesUpdated value)? resourcesUpdated,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_ResourcesUpdated value)? resourcesUpdated,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VillageEventCopyWith<$Res> {
  factory $VillageEventCopyWith(
          VillageEvent value, $Res Function(VillageEvent) then) =
      _$VillageEventCopyWithImpl<$Res, VillageEvent>;
}

/// @nodoc
class _$VillageEventCopyWithImpl<$Res, $Val extends VillageEvent>
    implements $VillageEventCopyWith<$Res> {
  _$VillageEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$LoadRequestedImplCopyWith<$Res> {
  factory _$$LoadRequestedImplCopyWith(
          _$LoadRequestedImpl value, $Res Function(_$LoadRequestedImpl) then) =
      __$$LoadRequestedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String villageId});
}

/// @nodoc
class __$$LoadRequestedImplCopyWithImpl<$Res>
    extends _$VillageEventCopyWithImpl<$Res, _$LoadRequestedImpl>
    implements _$$LoadRequestedImplCopyWith<$Res> {
  __$$LoadRequestedImplCopyWithImpl(
      _$LoadRequestedImpl _value, $Res Function(_$LoadRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? villageId = null,
  }) {
    return _then(_$LoadRequestedImpl(
      null == villageId
          ? _value.villageId
          : villageId // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$LoadRequestedImpl implements _LoadRequested {
  const _$LoadRequestedImpl(this.villageId);

  @override
  final String villageId;

  @override
  String toString() {
    return 'VillageEvent.loadRequested(villageId: $villageId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LoadRequestedImpl &&
            (identical(other.villageId, villageId) ||
                other.villageId == villageId));
  }

  @override
  int get hashCode => Object.hash(runtimeType, villageId);

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      __$$LoadRequestedImplCopyWithImpl<_$LoadRequestedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(Map<String, dynamic> data) resourcesUpdated,
  }) {
    return loadRequested(villageId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(Map<String, dynamic> data)? resourcesUpdated,
  }) {
    return loadRequested?.call(villageId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(Map<String, dynamic> data)? resourcesUpdated,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(villageId);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_ResourcesUpdated value) resourcesUpdated,
  }) {
    return loadRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_ResourcesUpdated value)? resourcesUpdated,
  }) {
    return loadRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_ResourcesUpdated value)? resourcesUpdated,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(this);
    }
    return orElse();
  }
}

abstract class _LoadRequested implements VillageEvent {
  const factory _LoadRequested(final String villageId) = _$LoadRequestedImpl;

  String get villageId;

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ResourcesUpdatedImplCopyWith<$Res> {
  factory _$$ResourcesUpdatedImplCopyWith(_$ResourcesUpdatedImpl value,
          $Res Function(_$ResourcesUpdatedImpl) then) =
      __$$ResourcesUpdatedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({Map<String, dynamic> data});
}

/// @nodoc
class __$$ResourcesUpdatedImplCopyWithImpl<$Res>
    extends _$VillageEventCopyWithImpl<$Res, _$ResourcesUpdatedImpl>
    implements _$$ResourcesUpdatedImplCopyWith<$Res> {
  __$$ResourcesUpdatedImplCopyWithImpl(_$ResourcesUpdatedImpl _value,
      $Res Function(_$ResourcesUpdatedImpl) _then)
      : super(_value, _then);

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = null,
  }) {
    return _then(_$ResourcesUpdatedImpl(
      null == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc

class _$ResourcesUpdatedImpl implements _ResourcesUpdated {
  const _$ResourcesUpdatedImpl(final Map<String, dynamic> data) : _data = data;

  final Map<String, dynamic> _data;
  @override
  Map<String, dynamic> get data {
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_data);
  }

  @override
  String toString() {
    return 'VillageEvent.resourcesUpdated(data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ResourcesUpdatedImpl &&
            const DeepCollectionEquality().equals(other._data, _data));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_data));

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ResourcesUpdatedImplCopyWith<_$ResourcesUpdatedImpl> get copyWith =>
      __$$ResourcesUpdatedImplCopyWithImpl<_$ResourcesUpdatedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(Map<String, dynamic> data) resourcesUpdated,
  }) {
    return resourcesUpdated(data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(Map<String, dynamic> data)? resourcesUpdated,
  }) {
    return resourcesUpdated?.call(data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(Map<String, dynamic> data)? resourcesUpdated,
    required TResult orElse(),
  }) {
    if (resourcesUpdated != null) {
      return resourcesUpdated(data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_ResourcesUpdated value) resourcesUpdated,
  }) {
    return resourcesUpdated(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_ResourcesUpdated value)? resourcesUpdated,
  }) {
    return resourcesUpdated?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_ResourcesUpdated value)? resourcesUpdated,
    required TResult orElse(),
  }) {
    if (resourcesUpdated != null) {
      return resourcesUpdated(this);
    }
    return orElse();
  }
}

abstract class _ResourcesUpdated implements VillageEvent {
  const factory _ResourcesUpdated(final Map<String, dynamic> data) =
      _$ResourcesUpdatedImpl;

  Map<String, dynamic> get data;

  /// Create a copy of VillageEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ResourcesUpdatedImplCopyWith<_$ResourcesUpdatedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
