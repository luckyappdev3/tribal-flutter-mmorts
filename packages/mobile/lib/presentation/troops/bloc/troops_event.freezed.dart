// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'troops_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$TroopsEvent {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String unitType, int count) recruitRequested,
    required TResult Function(Map<String, dynamic> data) recruitFinished,
    required TResult Function(String queueId) cancelRequested,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String unitType, int count)? recruitRequested,
    TResult? Function(Map<String, dynamic> data)? recruitFinished,
    TResult? Function(String queueId)? cancelRequested,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String unitType, int count)? recruitRequested,
    TResult Function(Map<String, dynamic> data)? recruitFinished,
    TResult Function(String queueId)? cancelRequested,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RecruitRequested value) recruitRequested,
    required TResult Function(_RecruitFinished value) recruitFinished,
    required TResult Function(_CancelRequested value) cancelRequested,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RecruitRequested value)? recruitRequested,
    TResult? Function(_RecruitFinished value)? recruitFinished,
    TResult? Function(_CancelRequested value)? cancelRequested,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RecruitRequested value)? recruitRequested,
    TResult Function(_RecruitFinished value)? recruitFinished,
    TResult Function(_CancelRequested value)? cancelRequested,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TroopsEventCopyWith<$Res> {
  factory $TroopsEventCopyWith(
          TroopsEvent value, $Res Function(TroopsEvent) then) =
      _$TroopsEventCopyWithImpl<$Res, TroopsEvent>;
}

/// @nodoc
class _$TroopsEventCopyWithImpl<$Res, $Val extends TroopsEvent>
    implements $TroopsEventCopyWith<$Res> {
  _$TroopsEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TroopsEvent
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
    extends _$TroopsEventCopyWithImpl<$Res, _$LoadRequestedImpl>
    implements _$$LoadRequestedImplCopyWith<$Res> {
  __$$LoadRequestedImplCopyWithImpl(
      _$LoadRequestedImpl _value, $Res Function(_$LoadRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of TroopsEvent
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
    return 'TroopsEvent.loadRequested(villageId: $villageId)';
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

  /// Create a copy of TroopsEvent
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
    required TResult Function(String unitType, int count) recruitRequested,
    required TResult Function(Map<String, dynamic> data) recruitFinished,
    required TResult Function(String queueId) cancelRequested,
  }) {
    return loadRequested(villageId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String unitType, int count)? recruitRequested,
    TResult? Function(Map<String, dynamic> data)? recruitFinished,
    TResult? Function(String queueId)? cancelRequested,
  }) {
    return loadRequested?.call(villageId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String unitType, int count)? recruitRequested,
    TResult Function(Map<String, dynamic> data)? recruitFinished,
    TResult Function(String queueId)? cancelRequested,
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
    required TResult Function(_RecruitRequested value) recruitRequested,
    required TResult Function(_RecruitFinished value) recruitFinished,
    required TResult Function(_CancelRequested value) cancelRequested,
  }) {
    return loadRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RecruitRequested value)? recruitRequested,
    TResult? Function(_RecruitFinished value)? recruitFinished,
    TResult? Function(_CancelRequested value)? cancelRequested,
  }) {
    return loadRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RecruitRequested value)? recruitRequested,
    TResult Function(_RecruitFinished value)? recruitFinished,
    TResult Function(_CancelRequested value)? cancelRequested,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(this);
    }
    return orElse();
  }
}

abstract class _LoadRequested implements TroopsEvent {
  const factory _LoadRequested(final String villageId) = _$LoadRequestedImpl;

  String get villageId;

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$RecruitRequestedImplCopyWith<$Res> {
  factory _$$RecruitRequestedImplCopyWith(_$RecruitRequestedImpl value,
          $Res Function(_$RecruitRequestedImpl) then) =
      __$$RecruitRequestedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String unitType, int count});
}

/// @nodoc
class __$$RecruitRequestedImplCopyWithImpl<$Res>
    extends _$TroopsEventCopyWithImpl<$Res, _$RecruitRequestedImpl>
    implements _$$RecruitRequestedImplCopyWith<$Res> {
  __$$RecruitRequestedImplCopyWithImpl(_$RecruitRequestedImpl _value,
      $Res Function(_$RecruitRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? unitType = null,
    Object? count = null,
  }) {
    return _then(_$RecruitRequestedImpl(
      null == unitType
          ? _value.unitType
          : unitType // ignore: cast_nullable_to_non_nullable
              as String,
      null == count
          ? _value.count
          : count // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc

class _$RecruitRequestedImpl implements _RecruitRequested {
  const _$RecruitRequestedImpl(this.unitType, this.count);

  @override
  final String unitType;
  @override
  final int count;

  @override
  String toString() {
    return 'TroopsEvent.recruitRequested(unitType: $unitType, count: $count)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RecruitRequestedImpl &&
            (identical(other.unitType, unitType) ||
                other.unitType == unitType) &&
            (identical(other.count, count) || other.count == count));
  }

  @override
  int get hashCode => Object.hash(runtimeType, unitType, count);

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$RecruitRequestedImplCopyWith<_$RecruitRequestedImpl> get copyWith =>
      __$$RecruitRequestedImplCopyWithImpl<_$RecruitRequestedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String unitType, int count) recruitRequested,
    required TResult Function(Map<String, dynamic> data) recruitFinished,
    required TResult Function(String queueId) cancelRequested,
  }) {
    return recruitRequested(unitType, count);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String unitType, int count)? recruitRequested,
    TResult? Function(Map<String, dynamic> data)? recruitFinished,
    TResult? Function(String queueId)? cancelRequested,
  }) {
    return recruitRequested?.call(unitType, count);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String unitType, int count)? recruitRequested,
    TResult Function(Map<String, dynamic> data)? recruitFinished,
    TResult Function(String queueId)? cancelRequested,
    required TResult orElse(),
  }) {
    if (recruitRequested != null) {
      return recruitRequested(unitType, count);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RecruitRequested value) recruitRequested,
    required TResult Function(_RecruitFinished value) recruitFinished,
    required TResult Function(_CancelRequested value) cancelRequested,
  }) {
    return recruitRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RecruitRequested value)? recruitRequested,
    TResult? Function(_RecruitFinished value)? recruitFinished,
    TResult? Function(_CancelRequested value)? cancelRequested,
  }) {
    return recruitRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RecruitRequested value)? recruitRequested,
    TResult Function(_RecruitFinished value)? recruitFinished,
    TResult Function(_CancelRequested value)? cancelRequested,
    required TResult orElse(),
  }) {
    if (recruitRequested != null) {
      return recruitRequested(this);
    }
    return orElse();
  }
}

abstract class _RecruitRequested implements TroopsEvent {
  const factory _RecruitRequested(final String unitType, final int count) =
      _$RecruitRequestedImpl;

  String get unitType;
  int get count;

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$RecruitRequestedImplCopyWith<_$RecruitRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$RecruitFinishedImplCopyWith<$Res> {
  factory _$$RecruitFinishedImplCopyWith(_$RecruitFinishedImpl value,
          $Res Function(_$RecruitFinishedImpl) then) =
      __$$RecruitFinishedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({Map<String, dynamic> data});
}

/// @nodoc
class __$$RecruitFinishedImplCopyWithImpl<$Res>
    extends _$TroopsEventCopyWithImpl<$Res, _$RecruitFinishedImpl>
    implements _$$RecruitFinishedImplCopyWith<$Res> {
  __$$RecruitFinishedImplCopyWithImpl(
      _$RecruitFinishedImpl _value, $Res Function(_$RecruitFinishedImpl) _then)
      : super(_value, _then);

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = null,
  }) {
    return _then(_$RecruitFinishedImpl(
      null == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc

class _$RecruitFinishedImpl implements _RecruitFinished {
  const _$RecruitFinishedImpl(final Map<String, dynamic> data) : _data = data;

  final Map<String, dynamic> _data;
  @override
  Map<String, dynamic> get data {
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_data);
  }

  @override
  String toString() {
    return 'TroopsEvent.recruitFinished(data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RecruitFinishedImpl &&
            const DeepCollectionEquality().equals(other._data, _data));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_data));

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$RecruitFinishedImplCopyWith<_$RecruitFinishedImpl> get copyWith =>
      __$$RecruitFinishedImplCopyWithImpl<_$RecruitFinishedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String unitType, int count) recruitRequested,
    required TResult Function(Map<String, dynamic> data) recruitFinished,
    required TResult Function(String queueId) cancelRequested,
  }) {
    return recruitFinished(data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String unitType, int count)? recruitRequested,
    TResult? Function(Map<String, dynamic> data)? recruitFinished,
    TResult? Function(String queueId)? cancelRequested,
  }) {
    return recruitFinished?.call(data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String unitType, int count)? recruitRequested,
    TResult Function(Map<String, dynamic> data)? recruitFinished,
    TResult Function(String queueId)? cancelRequested,
    required TResult orElse(),
  }) {
    if (recruitFinished != null) {
      return recruitFinished(data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RecruitRequested value) recruitRequested,
    required TResult Function(_RecruitFinished value) recruitFinished,
    required TResult Function(_CancelRequested value) cancelRequested,
  }) {
    return recruitFinished(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RecruitRequested value)? recruitRequested,
    TResult? Function(_RecruitFinished value)? recruitFinished,
    TResult? Function(_CancelRequested value)? cancelRequested,
  }) {
    return recruitFinished?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RecruitRequested value)? recruitRequested,
    TResult Function(_RecruitFinished value)? recruitFinished,
    TResult Function(_CancelRequested value)? cancelRequested,
    required TResult orElse(),
  }) {
    if (recruitFinished != null) {
      return recruitFinished(this);
    }
    return orElse();
  }
}

abstract class _RecruitFinished implements TroopsEvent {
  const factory _RecruitFinished(final Map<String, dynamic> data) =
      _$RecruitFinishedImpl;

  Map<String, dynamic> get data;

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$RecruitFinishedImplCopyWith<_$RecruitFinishedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$CancelRequestedImplCopyWith<$Res> {
  factory _$$CancelRequestedImplCopyWith(_$CancelRequestedImpl value,
          $Res Function(_$CancelRequestedImpl) then) =
      __$$CancelRequestedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String queueId});
}

/// @nodoc
class __$$CancelRequestedImplCopyWithImpl<$Res>
    extends _$TroopsEventCopyWithImpl<$Res, _$CancelRequestedImpl>
    implements _$$CancelRequestedImplCopyWith<$Res> {
  __$$CancelRequestedImplCopyWithImpl(
      _$CancelRequestedImpl _value, $Res Function(_$CancelRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? queueId = null,
  }) {
    return _then(_$CancelRequestedImpl(
      null == queueId
          ? _value.queueId
          : queueId // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$CancelRequestedImpl implements _CancelRequested {
  const _$CancelRequestedImpl(this.queueId);

  @override
  final String queueId;

  @override
  String toString() {
    return 'TroopsEvent.cancelRequested(queueId: $queueId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CancelRequestedImpl &&
            (identical(other.queueId, queueId) || other.queueId == queueId));
  }

  @override
  int get hashCode => Object.hash(runtimeType, queueId);

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CancelRequestedImplCopyWith<_$CancelRequestedImpl> get copyWith =>
      __$$CancelRequestedImplCopyWithImpl<_$CancelRequestedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function(String unitType, int count) recruitRequested,
    required TResult Function(Map<String, dynamic> data) recruitFinished,
    required TResult Function(String queueId) cancelRequested,
  }) {
    return cancelRequested(queueId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function(String unitType, int count)? recruitRequested,
    TResult? Function(Map<String, dynamic> data)? recruitFinished,
    TResult? Function(String queueId)? cancelRequested,
  }) {
    return cancelRequested?.call(queueId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function(String unitType, int count)? recruitRequested,
    TResult Function(Map<String, dynamic> data)? recruitFinished,
    TResult Function(String queueId)? cancelRequested,
    required TResult orElse(),
  }) {
    if (cancelRequested != null) {
      return cancelRequested(queueId);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RecruitRequested value) recruitRequested,
    required TResult Function(_RecruitFinished value) recruitFinished,
    required TResult Function(_CancelRequested value) cancelRequested,
  }) {
    return cancelRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RecruitRequested value)? recruitRequested,
    TResult? Function(_RecruitFinished value)? recruitFinished,
    TResult? Function(_CancelRequested value)? cancelRequested,
  }) {
    return cancelRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RecruitRequested value)? recruitRequested,
    TResult Function(_RecruitFinished value)? recruitFinished,
    TResult Function(_CancelRequested value)? cancelRequested,
    required TResult orElse(),
  }) {
    if (cancelRequested != null) {
      return cancelRequested(this);
    }
    return orElse();
  }
}

abstract class _CancelRequested implements TroopsEvent {
  const factory _CancelRequested(final String queueId) = _$CancelRequestedImpl;

  String get queueId;

  /// Create a copy of TroopsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CancelRequestedImplCopyWith<_$CancelRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
