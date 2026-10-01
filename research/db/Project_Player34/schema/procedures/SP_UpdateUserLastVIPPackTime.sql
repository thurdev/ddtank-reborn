-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserLastVIPPackTime (modified 2021-06-04T05:18:35.903)




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
