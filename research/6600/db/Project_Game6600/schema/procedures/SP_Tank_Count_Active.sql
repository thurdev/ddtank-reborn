-- SQL_STORED_PROCEDURE dbo.SP_Tank_Count_Active (modified 2015-01-25T14:04:48.260)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<记录数据：导入激活用户>
-- =============================================
CREATE Procedure [dbo].[SP_Tank_Count_Active]
@AppID int,
@SubID int
as
--declare @MaxID int
--select @MaxID=isnull(Max(UserID),0) from Count_Register

declare @MaxDate datetime
select @MaxDate=isnull(Max(RegDateTime),0) from Db_Count..Count_Register

insert into Db_Count..Count_Register(ApplicationId,SubID,RegDateTime,UserID,Sex,UserIP,UserName,UserOther) 
select @AppID,@SubID,[Date],UserID,Sex,cast(Db_Count.dbo.f_IP2Int(ActiveIP) as bigint),UserName,NickName from Db_Tank..Sys_Users_Detail where [Date]>@MaxDate

GO
