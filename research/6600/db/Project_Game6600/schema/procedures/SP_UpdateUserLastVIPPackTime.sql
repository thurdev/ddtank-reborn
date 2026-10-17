-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserLastVIPPackTime (modified 2015-01-25T14:04:48.217)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_UpdateUserLastVIPPackTime]
@UserID int,
@LastVIPPackTime datetime

AS

update [Sys_VIP_Info] set 
LastVIPPackTime = @LastVIPPackTime
where [UserID] = @UserID

GO
