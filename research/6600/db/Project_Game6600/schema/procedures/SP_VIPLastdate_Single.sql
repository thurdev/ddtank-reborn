-- SQL_STORED_PROCEDURE dbo.SP_VIPLastdate_Single (modified 2015-01-25T14:04:48.370)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_VIPLastdate_Single]
@UserID int
AS

update [Sys_VIP_Info] set 	   
      [VIPLastdate] = GETDATE() 
      where [UserID] = @UserID

return 1

GO
