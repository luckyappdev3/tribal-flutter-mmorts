// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'reports_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ReportsEvent {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() newReportReceived,
    required TResult Function(String reportId) markRead,
    required TResult Function() markAllRead,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? newReportReceived,
    TResult? Function(String reportId)? markRead,
    TResult? Function()? markAllRead,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? newReportReceived,
    TResult Function(String reportId)? markRead,
    TResult Function()? markAllRead,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_NewReportReceived value) newReportReceived,
    required TResult Function(_MarkRead value) markRead,
    required TResult Function(_MarkAllRead value) markAllRead,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_NewReportReceived value)? newReportReceived,
    TResult? Function(_MarkRead value)? markRead,
    TResult? Function(_MarkAllRead value)? markAllRead,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_NewReportReceived value)? newReportReceived,
    TResult Function(_MarkRead value)? markRead,
    TResult Function(_MarkAllRead value)? markAllRead,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportsEventCopyWith<$Res> {
  factory $ReportsEventCopyWith(
          ReportsEvent value, $Res Function(ReportsEvent) then) =
      _$ReportsEventCopyWithImpl<$Res, ReportsEvent>;
}

/// @nodoc
class _$ReportsEventCopyWithImpl<$Res, $Val extends ReportsEvent>
    implements $ReportsEventCopyWith<$Res> {
  _$ReportsEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReportsEvent
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
    extends _$ReportsEventCopyWithImpl<$Res, _$LoadRequestedImpl>
    implements _$$LoadRequestedImplCopyWith<$Res> {
  __$$LoadRequestedImplCopyWithImpl(
      _$LoadRequestedImpl _value, $Res Function(_$LoadRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReportsEvent
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
    return 'ReportsEvent.loadRequested(villageId: $villageId)';
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

  /// Create a copy of ReportsEvent
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
    required TResult Function() refreshRequested,
    required TResult Function() newReportReceived,
    required TResult Function(String reportId) markRead,
    required TResult Function() markAllRead,
  }) {
    return loadRequested(villageId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? newReportReceived,
    TResult? Function(String reportId)? markRead,
    TResult? Function()? markAllRead,
  }) {
    return loadRequested?.call(villageId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? newReportReceived,
    TResult Function(String reportId)? markRead,
    TResult Function()? markAllRead,
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
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_NewReportReceived value) newReportReceived,
    required TResult Function(_MarkRead value) markRead,
    required TResult Function(_MarkAllRead value) markAllRead,
  }) {
    return loadRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_NewReportReceived value)? newReportReceived,
    TResult? Function(_MarkRead value)? markRead,
    TResult? Function(_MarkAllRead value)? markAllRead,
  }) {
    return loadRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_NewReportReceived value)? newReportReceived,
    TResult Function(_MarkRead value)? markRead,
    TResult Function(_MarkAllRead value)? markAllRead,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(this);
    }
    return orElse();
  }
}

abstract class _LoadRequested implements ReportsEvent {
  const factory _LoadRequested(final String villageId) = _$LoadRequestedImpl;

  String get villageId;

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$RefreshRequestedImplCopyWith<$Res> {
  factory _$$RefreshRequestedImplCopyWith(_$RefreshRequestedImpl value,
          $Res Function(_$RefreshRequestedImpl) then) =
      __$$RefreshRequestedImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$RefreshRequestedImplCopyWithImpl<$Res>
    extends _$ReportsEventCopyWithImpl<$Res, _$RefreshRequestedImpl>
    implements _$$RefreshRequestedImplCopyWith<$Res> {
  __$$RefreshRequestedImplCopyWithImpl(_$RefreshRequestedImpl _value,
      $Res Function(_$RefreshRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$RefreshRequestedImpl implements _RefreshRequested {
  const _$RefreshRequestedImpl();

  @override
  String toString() {
    return 'ReportsEvent.refreshRequested()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$RefreshRequestedImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() newReportReceived,
    required TResult Function(String reportId) markRead,
    required TResult Function() markAllRead,
  }) {
    return refreshRequested();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? newReportReceived,
    TResult? Function(String reportId)? markRead,
    TResult? Function()? markAllRead,
  }) {
    return refreshRequested?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? newReportReceived,
    TResult Function(String reportId)? markRead,
    TResult Function()? markAllRead,
    required TResult orElse(),
  }) {
    if (refreshRequested != null) {
      return refreshRequested();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_NewReportReceived value) newReportReceived,
    required TResult Function(_MarkRead value) markRead,
    required TResult Function(_MarkAllRead value) markAllRead,
  }) {
    return refreshRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_NewReportReceived value)? newReportReceived,
    TResult? Function(_MarkRead value)? markRead,
    TResult? Function(_MarkAllRead value)? markAllRead,
  }) {
    return refreshRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_NewReportReceived value)? newReportReceived,
    TResult Function(_MarkRead value)? markRead,
    TResult Function(_MarkAllRead value)? markAllRead,
    required TResult orElse(),
  }) {
    if (refreshRequested != null) {
      return refreshRequested(this);
    }
    return orElse();
  }
}

abstract class _RefreshRequested implements ReportsEvent {
  const factory _RefreshRequested() = _$RefreshRequestedImpl;
}

/// @nodoc
abstract class _$$NewReportReceivedImplCopyWith<$Res> {
  factory _$$NewReportReceivedImplCopyWith(_$NewReportReceivedImpl value,
          $Res Function(_$NewReportReceivedImpl) then) =
      __$$NewReportReceivedImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$NewReportReceivedImplCopyWithImpl<$Res>
    extends _$ReportsEventCopyWithImpl<$Res, _$NewReportReceivedImpl>
    implements _$$NewReportReceivedImplCopyWith<$Res> {
  __$$NewReportReceivedImplCopyWithImpl(_$NewReportReceivedImpl _value,
      $Res Function(_$NewReportReceivedImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$NewReportReceivedImpl implements _NewReportReceived {
  const _$NewReportReceivedImpl();

  @override
  String toString() {
    return 'ReportsEvent.newReportReceived()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$NewReportReceivedImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() newReportReceived,
    required TResult Function(String reportId) markRead,
    required TResult Function() markAllRead,
  }) {
    return newReportReceived();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? newReportReceived,
    TResult? Function(String reportId)? markRead,
    TResult? Function()? markAllRead,
  }) {
    return newReportReceived?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? newReportReceived,
    TResult Function(String reportId)? markRead,
    TResult Function()? markAllRead,
    required TResult orElse(),
  }) {
    if (newReportReceived != null) {
      return newReportReceived();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_NewReportReceived value) newReportReceived,
    required TResult Function(_MarkRead value) markRead,
    required TResult Function(_MarkAllRead value) markAllRead,
  }) {
    return newReportReceived(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_NewReportReceived value)? newReportReceived,
    TResult? Function(_MarkRead value)? markRead,
    TResult? Function(_MarkAllRead value)? markAllRead,
  }) {
    return newReportReceived?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_NewReportReceived value)? newReportReceived,
    TResult Function(_MarkRead value)? markRead,
    TResult Function(_MarkAllRead value)? markAllRead,
    required TResult orElse(),
  }) {
    if (newReportReceived != null) {
      return newReportReceived(this);
    }
    return orElse();
  }
}

abstract class _NewReportReceived implements ReportsEvent {
  const factory _NewReportReceived() = _$NewReportReceivedImpl;
}

/// @nodoc
abstract class _$$MarkReadImplCopyWith<$Res> {
  factory _$$MarkReadImplCopyWith(
          _$MarkReadImpl value, $Res Function(_$MarkReadImpl) then) =
      __$$MarkReadImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String reportId});
}

/// @nodoc
class __$$MarkReadImplCopyWithImpl<$Res>
    extends _$ReportsEventCopyWithImpl<$Res, _$MarkReadImpl>
    implements _$$MarkReadImplCopyWith<$Res> {
  __$$MarkReadImplCopyWithImpl(
      _$MarkReadImpl _value, $Res Function(_$MarkReadImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? reportId = null,
  }) {
    return _then(_$MarkReadImpl(
      null == reportId
          ? _value.reportId
          : reportId // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$MarkReadImpl implements _MarkRead {
  const _$MarkReadImpl(this.reportId);

  @override
  final String reportId;

  @override
  String toString() {
    return 'ReportsEvent.markRead(reportId: $reportId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MarkReadImpl &&
            (identical(other.reportId, reportId) ||
                other.reportId == reportId));
  }

  @override
  int get hashCode => Object.hash(runtimeType, reportId);

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$MarkReadImplCopyWith<_$MarkReadImpl> get copyWith =>
      __$$MarkReadImplCopyWithImpl<_$MarkReadImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() newReportReceived,
    required TResult Function(String reportId) markRead,
    required TResult Function() markAllRead,
  }) {
    return markRead(reportId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? newReportReceived,
    TResult? Function(String reportId)? markRead,
    TResult? Function()? markAllRead,
  }) {
    return markRead?.call(reportId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? newReportReceived,
    TResult Function(String reportId)? markRead,
    TResult Function()? markAllRead,
    required TResult orElse(),
  }) {
    if (markRead != null) {
      return markRead(reportId);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_NewReportReceived value) newReportReceived,
    required TResult Function(_MarkRead value) markRead,
    required TResult Function(_MarkAllRead value) markAllRead,
  }) {
    return markRead(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_NewReportReceived value)? newReportReceived,
    TResult? Function(_MarkRead value)? markRead,
    TResult? Function(_MarkAllRead value)? markAllRead,
  }) {
    return markRead?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_NewReportReceived value)? newReportReceived,
    TResult Function(_MarkRead value)? markRead,
    TResult Function(_MarkAllRead value)? markAllRead,
    required TResult orElse(),
  }) {
    if (markRead != null) {
      return markRead(this);
    }
    return orElse();
  }
}

abstract class _MarkRead implements ReportsEvent {
  const factory _MarkRead(final String reportId) = _$MarkReadImpl;

  String get reportId;

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$MarkReadImplCopyWith<_$MarkReadImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$MarkAllReadImplCopyWith<$Res> {
  factory _$$MarkAllReadImplCopyWith(
          _$MarkAllReadImpl value, $Res Function(_$MarkAllReadImpl) then) =
      __$$MarkAllReadImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$MarkAllReadImplCopyWithImpl<$Res>
    extends _$ReportsEventCopyWithImpl<$Res, _$MarkAllReadImpl>
    implements _$$MarkAllReadImplCopyWith<$Res> {
  __$$MarkAllReadImplCopyWithImpl(
      _$MarkAllReadImpl _value, $Res Function(_$MarkAllReadImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReportsEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$MarkAllReadImpl implements _MarkAllRead {
  const _$MarkAllReadImpl();

  @override
  String toString() {
    return 'ReportsEvent.markAllRead()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$MarkAllReadImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() newReportReceived,
    required TResult Function(String reportId) markRead,
    required TResult Function() markAllRead,
  }) {
    return markAllRead();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? newReportReceived,
    TResult? Function(String reportId)? markRead,
    TResult? Function()? markAllRead,
  }) {
    return markAllRead?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? newReportReceived,
    TResult Function(String reportId)? markRead,
    TResult Function()? markAllRead,
    required TResult orElse(),
  }) {
    if (markAllRead != null) {
      return markAllRead();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_NewReportReceived value) newReportReceived,
    required TResult Function(_MarkRead value) markRead,
    required TResult Function(_MarkAllRead value) markAllRead,
  }) {
    return markAllRead(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_NewReportReceived value)? newReportReceived,
    TResult? Function(_MarkRead value)? markRead,
    TResult? Function(_MarkAllRead value)? markAllRead,
  }) {
    return markAllRead?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_NewReportReceived value)? newReportReceived,
    TResult Function(_MarkRead value)? markRead,
    TResult Function(_MarkAllRead value)? markAllRead,
    required TResult orElse(),
  }) {
    if (markAllRead != null) {
      return markAllRead(this);
    }
    return orElse();
  }
}

abstract class _MarkAllRead implements ReportsEvent {
  const factory _MarkAllRead() = _$MarkAllReadImpl;
}
