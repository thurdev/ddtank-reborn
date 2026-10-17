-- SQL_STORED_PROCEDURE dbo.SP_Service_List (modified 2015-01-25T14:04:48.683)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<服务器信息：全部频道>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Service_List]  
AS  

   begin 
     select * from Server_List
   end

GO
