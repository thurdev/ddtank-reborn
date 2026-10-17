-- SQL_STORED_PROCEDURE dbo.SP_Reset_Luck_Count (modified 2015-03-05T16:09:11.187)

-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Reset_Luck_Count]
AS
BEGIN
UPDATE [dbo].[Sys_Active_System_Data]
   SET [luckCount] = 0
 WHERE UserID > 0
END


GO
