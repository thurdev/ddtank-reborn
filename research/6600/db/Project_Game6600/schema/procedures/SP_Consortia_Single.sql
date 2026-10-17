-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Single (modified 2015-01-25T14:04:48.767)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：读到一条有效公会信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Single]   
 @ID int
AS  

   begin 
     select * from V_Consortia WHERE ConsortiaID=@ID and IsExist = 1
   end

GO
