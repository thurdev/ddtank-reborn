-- SQL_SCALAR_FUNCTION dbo.GetTranslation (modified 2021-05-23T02:41:31.983)


--获取语言包
CREATE    FUNCTION [dbo].[GetTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
BEGIN
 --定义变量
 declare @language as nvarchar(200)
 declare @translated as nvarchar(200)
 SET @language='Vietnam'
 SELECT @language=ISNULL(value,'Vietnam') FROM dbo.Server_Config WHERE Name='Language'

 --调用相应的函数
 

 SELECT @translated  =
     CASE @language     
     WHEN 'Chinese' THEN dbo.ChineseTranslation(@TranslationID)
     WHEN 'English' THEN dbo.EnglishTranslation(@TranslationID)
     WHEN 'Traditional' THEN dbo.TraditionalTranslation(@TranslationID)
     WHEN 'Vietnam' THEN dbo.VietnamTranslation(@TranslationID)
	 WHEN 'Portuguese' THEN dbo.TraditionalTranslation(@TranslationID)
     ELSE dbo.ChineseTranslation(@TranslationID) end
 return @translated
end 


















GO
