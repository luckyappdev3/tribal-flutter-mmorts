// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'construction_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ConstructionEvent {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String buildingId) upgradeRequested,
    required TResult Function(Map<String, dynamic> data) buildFinished,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String buildingId)? upgradeRequested,
    TResult? Function(Map<String, dynamic> data)? buildFinished,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String buildingId)? upgradeRequested,
    TResult Function(Map<String, dynamic> data)? buildFinished,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_UpgradeRequested value) upgradeRequested,
    required TResult Function(_BuildFinished value) buildFinished,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_UpgradeRequested value)? upgradeRequested,
    TResult? Function(_BuildFinished value)? buildFinished,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_UpgradeRequested value)? upgradeRequested,
    TResult Function(_BuildFinished value)? buildFinished,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ConstructionEventCopyWith<$Res> {
  factory $ConstructionEventCopyWith(
          ConstructionEvent value, $Res Function(ConstructionEvent) then) =
      _$ConstructionEventCopyWithImpl<$Res, ConstructionEvent>;
}

/// @nodoc
class _$ConstructionEventCopyWithImpl<$Res, $Val extends ConstructionEvent>
    implements $ConstructionEventCopyWith<$Res> {
  _$ConstructionEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ConstructionEvent
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
    extends _$ConstructionEventCopyWithImpl<$Res, _$LoadRequestedImpl>
    implements _$$LoadRequestedImplCopyWith<$Res> {
  __$$LoadRequestedImplCopyWithImpl(
      _$LoadRequestedImpl _value, $Res Function(_$LoadRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of ConstructionEvent
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
    return 'ConstructionEvent.loadRequested(villageId: $villageId)';
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

  /// Create a copy of ConstructionEvent
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
    required TResult Function(String buildingId) upgradeRequested,
    required TResult Function(Map<String, dynamic> data) buildFinished,
  }) {
    return loadRequested(villageId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String buildingId)? upgradeRequested,
    TResult? Function(Map<String, dynamic> data)? buildFinished,
  }) {
    return loadRequested?.call(villageId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String buildingId)? upgradeRequested,
    TResult Function(Map<String, dynamic> data)? buildFinished,
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
    required TResult Function(_UpgradeRequested value) upgradeRequested,
    required TResult Function(_BuildFinished value) buildFinished,
  }) {
    return loadRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_UpgradeRequested value)? upgradeRequested,
    TResult? Function(_BuildFinished value)? buildFinished,
  }) {
    return loadRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_UpgradeRequested value)? upgradeRequested,
    TResult Function(_BuildFinished value)? buildFinished,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(this);
    }
    return orElse();
  }
}

abstract class _LoadRequested implements ConstructionEvent {
  const factory _LoadRequested(final String villageId) = _$LoadRequestedImpl;

  String get villageId;

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$UpgradeRequestedImplCopyWith<$Res> {
  factory _$$UpgradeRequestedImplCopyWith(_$UpgradeRequestedImpl value,
          $Res Function(_$UpgradeRequestedImpl) then) =
      __$$UpgradeRequestedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String buildingId});
}

/// @nodoc
class __$$UpgradeRequestedImplCopyWithImpl<$Res>
    extends _$ConstructionEventCopyWithImpl<$Res, _$UpgradeRequestedImpl>
    implements _$$UpgradeRequestedImplCopyWith<$Res> {
  __$$UpgradeRequestedImplCopyWithImpl(_$UpgradeRequestedImpl _value,
      $Res Function(_$UpgradeRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? buildingId = null,
  }) {
    return _then(_$UpgradeRequestedImpl(
      null == buildingId
          ? _value.buildingId
          : buildingId // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$UpgradeRequestedImpl implements _UpgradeRequested {
  const _$UpgradeRequestedImpl(this.buildingId);

  @override
  final String buildingId;

  @override
  String toString() {
    return 'ConstructionEvent.upgradeRequested(buildingId: $buildingId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UpgradeRequestedImpl &&
            (identical(other.buildingId, buildingId) ||
                other.buildingId == buildingId));
  }

  @override
  int get hashCode => Object.hash(runtimeType, buildingId);

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UpgradeRequestedImplCopyWith<_$UpgradeRequestedImpl> get copyWith =>
      __$$UpgradeRequestedImplCopyWithImpl<_$UpgradeRequestedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String buildingId) upgradeRequested,
    required TResult Function(Map<String, dynamic> data) buildFinished,
  }) {
    return upgradeRequested(buildingId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String buildingId)? upgradeRequested,
    TResult? Function(Map<String, dynamic> data)? buildFinished,
  }) {
    return upgradeRequested?.call(buildingId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String buildingId)? upgradeRequested,
    TResult Function(Map<String, dynamic> data)? buildFinished,
    required TResult orElse(),
  }) {
    if (upgradeRequested != null) {
      return upgradeRequested(buildingId);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_UpgradeRequested value) upgradeRequested,
    required TResult Function(_BuildFinished value) buildFinished,
  }) {
    return upgradeRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_UpgradeRequested value)? upgradeRequested,
    TResult? Function(_BuildFinished value)? buildFinished,
  }) {
    return upgradeRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_UpgradeRequested value)? upgradeRequested,
    TResult Function(_BuildFinished value)? buildFinished,
    required TResult orElse(),
  }) {
    if (upgradeRequested != null) {
      return upgradeRequested(this);
    }
    return orElse();
  }
}

abstract class _UpgradeRequested implements ConstructionEvent {
  const factory _UpgradeRequested(final String buildingId) =
      _$UpgradeRequestedImpl;

  String get buildingId;

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UpgradeRequestedImplCopyWith<_$UpgradeRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$BuildFinishedImplCopyWith<$Res> {
  factory _$$BuildFinishedImplCopyWith(
          _$BuildFinishedImpl value, $Res Function(_$BuildFinishedImpl) then) =
      __$$BuildFinishedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({Map<String, dynamic> data});
}

/// @nodoc
class __$$BuildFinishedImplCopyWithImpl<$Res>
    extends _$ConstructionEventCopyWithImpl<$Res, _$BuildFinishedImpl>
    implements _$$BuildFinishedImplCopyWith<$Res> {
  __$$BuildFinishedImplCopyWithImpl(
      _$BuildFinishedImpl _value, $Res Function(_$BuildFinishedImpl) _then)
      : super(_value, _then);

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = null,
  }) {
    return _then(_$BuildFinishedImpl(
      null == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc

class _$BuildFinishedImpl implements _BuildFinished {
  const _$BuildFinishedImpl(final Map<String, dynamic> data) : _data = data;

  final Map<String, dynamic> _data;
  @override
  Map<String, dynamic> get data {
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_data);
  }

  @override
  String toString() {
    return 'ConstructionEvent.buildFinished(data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BuildFinishedImpl &&
            const DeepCollectionEquality().equals(other._data, _data));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_data));

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BuildFinishedImplCopyWith<_$BuildFinishedImpl> get copyWith =>
      __$$BuildFinishedImplCopyWithImpl<_$BuildFinishedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String buildingId) upgradeRequested,
    required TResult Function(Map<String, dynamic> data) buildFinished,
  }) {
    return buildFinished(data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String buildingId)? upgradeRequested,
    TResult? Function(Map<String, dynamic> data)? buildFinished,
  }) {
    return buildFinished?.call(data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String buildingId)? upgradeRequested,
    TResult Function(Map<String, dynamic> data)? buildFinished,
    required TResult orElse(),
  }) {
    if (buildFinished != null) {
      return buildFinished(data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_UpgradeRequested value) upgradeRequested,
    required TResult Function(_BuildFinished value) buildFinished,
  }) {
    return buildFinished(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_UpgradeRequested value)? upgradeRequested,
    TResult? Function(_BuildFinished value)? buildFinished,
  }) {
    return buildFinished?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_UpgradeRequested value)? upgradeRequested,
    TResult Function(_BuildFinished value)? buildFinished,
    required TResult orElse(),
  }) {
    if (buildFinished != null) {
      return buildFinished(this);
    }
    return orElse();
  }
}

abstract class _BuildFinished implements ConstructionEvent {
  const factory _BuildFinished(final Map<String, dynamic> data) =
      _$BuildFinishedImpl;

  Map<String, dynamic> get data;

  /// Create a copy of ConstructionEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BuildFinishedImplCopyWith<_$BuildFinishedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
