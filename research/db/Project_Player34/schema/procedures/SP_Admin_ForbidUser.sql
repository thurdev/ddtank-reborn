-- SQL_STORED_PROCEDURE dbo.SP_Admin_ForbidUser (modified 2021-06-04T05:18:34.460)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<帐号封停>
-- =============================================
CREATE Procedure [dbo].[SP_Admin_ForbidUser]
@UserName Nvarchar(50),
@NickName Nvarchar(50),
@UserID int output,
@ForbidDate datetime,
@IsExist bit,
@ForbidReason Nvarchar(1000)
as

if @UserName<>''
begin 
   select @UserID=isnull(UserID,0) from Sys_Users_Detail where UserName = @UserName 
end

if @NickName<>''
begin 
   select @UserID=isnull(UserID,0) from Sys_Users_Detail where NickName = @NickName 
end

if @UserID<>0
begin 
   select @UserID=isnull(UserID,0) from Sys_Users_Detail where  UserID = @UserID
end

update Sys_Users_Detail set IsExist = @IsExist,ForbidDate = @ForbidDate,ForbidReason = @ForbidReason  where UserID = @UserID

GO
